-- Server-side game rules. All point credits happen here, atomically, using
-- amounts from the catalogue — never amounts sent by the client.

-- Daily anti-farming cap on credited completions (points are virtual, but
-- this keeps self-reported progress within plausible limits).
create or replace function public._max_completions_per_day() returns integer
language sql immutable as $$ select 60 $$;

create or replace function public.award_achievements(p_user uuid)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_completed integer;
  v_discovered integer;
  v_legendary integer;
  v_rarities integer;
  v_best_streak integer;
  v_new integer := 0;
  r record;
begin
  select count(*) into v_completed from public.user_challenge_attempts
    where user_id = p_user and status = 'completed';
  select count(*) into v_discovered from public.card_discovery where user_id = p_user;
  select count(*) filter (where c.rarity_id = 'legendary'), count(distinct c.rarity_id)
    into v_legendary, v_rarities
    from public.user_challenge_attempts a join public.challenges c on c.id = a.challenge_id
    where a.user_id = p_user and a.status = 'completed';
  -- Longest run of consecutive UTC days with a completion (gaps and islands).
  select coalesce(max(len), 0) into v_best_streak from (
    select count(*) as len from (
      select d, d - (row_number() over (order by d))::integer as grp
      from (select distinct (completed_at at time zone 'utc')::date as d
            from public.user_challenge_attempts
            where user_id = p_user and status = 'completed') days
    ) g group by grp
  ) runs;

  for r in
    select a.id, a.reward_points from public.achievements a
    where not exists (select 1 from public.user_achievements u where u.user_id = p_user and u.achievement_id = a.id)
      and case a.id
        when 'complete_1' then v_completed >= 1
        when 'complete_5' then v_completed >= 5
        when 'complete_10' then v_completed >= 10
        when 'complete_25' then v_completed >= 25
        when 'complete_50' then v_completed >= 50
        when 'first_legendary' then v_legendary >= 1
        when 'all_rarities' then v_rarities >= 4
        when 'streak_3' then v_best_streak >= 3
        when 'streak_7' then v_best_streak >= 7
        when 'discover_10' then v_discovered >= 10
        when 'discover_30' then v_discovered >= 30
        else false
      end
  loop
    insert into public.user_achievements (user_id, achievement_id) values (p_user, r.id) on conflict do nothing;
    if r.reward_points > 0 then
      insert into public.points_ledger (user_id, idempotency_key, amount, reason, achievement_id)
      values (p_user, 'achievement_unlocked:' || r.id, r.reward_points, 'achievement_unlocked', r.id)
      on conflict (user_id, idempotency_key) do nothing;
    end if;
    v_new := v_new + 1;
  end loop;
  return v_new;
end;
$$;

/**
 * Idempotent sync of local progress (also used for the guest → account
 * migration). Runs in a single transaction.
 *
 * p_attempts:    [{ id, challenge_id, status, cycle, created_at, completed_at, abandoned_at }]
 * p_discoveries: [{ challenge_id, first_seen_at, last_seen_at, times_seen }]
 *
 * Rules:
 * - Unknown/unavailable challenges are ignored.
 * - New attempts are inserted; existing ones may only move accepted → completed|abandoned.
 *   Terminal states never change, and rows of other users are never touched.
 * - Each completed attempt is credited once via the ledger's unique key, with
 *   the catalogue's point value.
 * - Timestamps from the future are clamped to now().
 */
create or replace function public.sync_progress(p_attempts jsonb default '[]', p_discoveries jsonb default '[]')
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_now timestamptz := now();
  a jsonb;
  d jsonb;
  v_status text;
  v_completed_at timestamptz;
  v_today_count integer;
  v_balance bigint;
  v_earned bigint;
begin
  if v_user is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if jsonb_array_length(p_attempts) > 1000 or jsonb_array_length(p_discoveries) > 1000 then
    raise exception 'payload too large' using errcode = '54000';
  end if;

  for a in select * from jsonb_array_elements(p_attempts) loop
    v_status := a->>'status';
    continue when v_status not in ('accepted', 'completed', 'rejected', 'abandoned');
    continue when not exists (select 1 from public.challenges c where c.id = a->>'challenge_id');
    v_completed_at := case when v_status = 'completed'
      then least(coalesce((a->>'completed_at')::timestamptz, v_now), v_now) end;

    if v_status = 'completed' then
      select count(*) into v_today_count from public.user_challenge_attempts
        where user_id = v_user and status = 'completed' and completed_at > v_now - interval '24 hours';
      if v_today_count >= public._max_completions_per_day() then
        v_status := 'accepted'; -- keep it pending; it will be credited on a later sync
        v_completed_at := null;
      end if;
    end if;

    begin
      insert into public.user_challenge_attempts as t
        (id, user_id, challenge_id, status, cycle, created_at, updated_at, completed_at, abandoned_at)
      values (
        (a->>'id')::uuid, v_user, a->>'challenge_id', v_status,
        greatest(coalesce((a->>'cycle')::integer, 1), 1),
        least(coalesce((a->>'created_at')::timestamptz, v_now), v_now), v_now, v_completed_at,
        case when v_status = 'abandoned' then least(coalesce((a->>'abandoned_at')::timestamptz, v_now), v_now) end
      )
      on conflict (id) do update set
        status = excluded.status,
        completed_at = excluded.completed_at,
        abandoned_at = excluded.abandoned_at,
        updated_at = v_now
      where t.user_id = v_user
        and t.status = 'accepted'
        and excluded.status in ('completed', 'abandoned');
    exception when unique_violation then
      -- Same card already completed in this cycle: ignore this duplicate.
      null;
    end;
  end loop;

  -- Credit every completed attempt exactly once.
  insert into public.points_ledger (user_id, idempotency_key, amount, reason, attempt_id, created_at)
  select v_user, 'challenge_completed:' || t.id, c.points, 'challenge_completed', t.id, t.completed_at
  from public.user_challenge_attempts t
  join public.challenges c on c.id = t.challenge_id
  where t.user_id = v_user and t.status = 'completed'
  on conflict (user_id, idempotency_key) do nothing;

  for d in select * from jsonb_array_elements(p_discoveries) loop
    continue when not exists (select 1 from public.challenges c where c.id = d->>'challenge_id');
    insert into public.card_discovery as cd (user_id, challenge_id, first_seen_at, last_seen_at, times_seen)
    values (
      v_user, d->>'challenge_id',
      least(coalesce((d->>'first_seen_at')::timestamptz, v_now), v_now),
      least(coalesce((d->>'last_seen_at')::timestamptz, v_now), v_now),
      greatest(coalesce((d->>'times_seen')::integer, 1), 1)
    )
    on conflict (user_id, challenge_id) do update set
      first_seen_at = least(cd.first_seen_at, excluded.first_seen_at),
      last_seen_at = greatest(cd.last_seen_at, excluded.last_seen_at),
      times_seen = greatest(cd.times_seen, excluded.times_seen);
  end loop;

  perform public.award_achievements(v_user);

  select coalesce(sum(amount), 0), coalesce(sum(amount) filter (where amount > 0), 0)
    into v_balance, v_earned
    from public.points_ledger where user_id = v_user;

  return jsonb_build_object('balance', v_balance, 'earned', v_earned);
end;
$$;

revoke all on function public.award_achievements(uuid) from public, anon, authenticated;
revoke all on function public.sync_progress(jsonb, jsonb) from public, anon;
grant execute on function public.sync_progress(jsonb, jsonb) to authenticated;
