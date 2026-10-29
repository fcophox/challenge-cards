-- Row Level Security: every user can only read their own private rows.
-- Points, attempts, achievements and discoveries are written exclusively
-- through SECURITY DEFINER functions (next migration), never directly.

alter table public.card_rarities enable row level security;
alter table public.challenges enable row level security;
alter table public.achievements enable row level security;
alter table public.user_profiles enable row level security;
alter table public.user_challenge_attempts enable row level security;
alter table public.points_ledger enable row level security;
alter table public.user_achievements enable row level security;
alter table public.card_discovery enable row level security;
alter table public.challenge_evidence enable row level security;

-- Catalogue: readable by everyone (needed to play offline after first load).
create policy "catalogue read" on public.card_rarities for select using (true);
create policy "catalogue read" on public.challenges for select using (true);
create policy "catalogue read" on public.achievements for select using (true);

-- Profile: own row only.
create policy "own profile read" on public.user_profiles for select using ((select auth.uid()) = id);
create policy "own profile update" on public.user_profiles for update
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Read-only from the client; writes go through RPCs.
create policy "own attempts read" on public.user_challenge_attempts for select using ((select auth.uid()) = user_id);
create policy "own ledger read" on public.points_ledger for select using ((select auth.uid()) = user_id);
create policy "own achievements read" on public.user_achievements for select using ((select auth.uid()) = user_id);
create policy "own discovery read" on public.card_discovery for select using ((select auth.uid()) = user_id);

-- Evidence metadata: owner can read, add (for own attempts) and delete.
create policy "own evidence read" on public.challenge_evidence for select using ((select auth.uid()) = user_id);
create policy "own evidence insert" on public.challenge_evidence for insert with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.user_challenge_attempts a
    where a.id = attempt_id and a.user_id = (select auth.uid())
  )
);
create policy "own evidence delete" on public.challenge_evidence for delete using ((select auth.uid()) = user_id);

-- Explicitly revoke direct writes on server-managed tables.
revoke insert, update, delete on public.points_ledger, public.user_challenge_attempts,
  public.user_achievements, public.card_discovery from anon, authenticated;
revoke insert, update, delete on public.card_rarities, public.challenges, public.achievements from anon, authenticated;

-- ---------- Storage: private evidence bucket ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('evidence', 'evidence', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Objects live under "<user_id>/..." and only their owner can touch them.
create policy "evidence owner read" on storage.objects for select to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "evidence owner insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "evidence owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
