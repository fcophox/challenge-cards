-- Challenge Cards — core schema.
-- Catalogue tables are public read-only; user tables are private (see RLS migration).

create extension if not exists pgcrypto;

-- ---------- Catalogue ----------

create table public.card_rarities (
  id text primary key,
  tier smallint not null check (tier > 0),
  name text not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  weight numeric not null check (weight >= 0),
  effect text not null default 'none'
);

create table public.challenges (
  id text primary key,
  title text not null check (char_length(title) between 3 and 140),
  description text not null default '',
  instructions text[] not null default '{}',
  category text not null,
  rarity_id text not null references public.card_rarities (id),
  difficulty text not null check (difficulty in ('easy', 'moderate', 'hard', 'epic')),
  -- Reward is per challenge, independent from rarity and difficulty.
  points integer not null check (points >= 0),
  estimated_minutes integer not null check (estimated_minutes > 0),
  evidence_type text not null check (evidence_type in ('confirmation', 'photo', 'text', 'none')),
  available boolean not null default true,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index challenges_rarity_idx on public.challenges (rarity_id) where available;

create table public.achievements (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  reward_points integer not null default 0 check (reward_points >= 0)
);

-- ---------- Per user ----------

create table public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Jugador' check (char_length(display_name) between 1 and 24),
  avatar text not null default '🦊' check (char_length(avatar) <= 16),
  settings jsonb not null default '{}'::jsonb,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Attempt ids are generated on the client (UUID) so offline attempts can be
-- synced idempotently.
create table public.user_challenge_attempts (
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge_id text not null references public.challenges (id),
  status text not null check (status in ('accepted', 'completed', 'rejected', 'abandoned')),
  cycle integer not null default 1 check (cycle > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  abandoned_at timestamptz,
  check ((status = 'completed') = (completed_at is not null))
);
create index attempts_user_idx on public.user_challenge_attempts (user_id, status);
-- Deck rule mirrored on the server: a card can be completed once per cycle.
create unique index attempts_one_completion_per_cycle
  on public.user_challenge_attempts (user_id, challenge_id, cycle) where status = 'completed';

-- Append-only ledger. Balance = sum(amount). The unique key makes every credit idempotent.
create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  idempotency_key text not null,
  amount integer not null,
  reason text not null check (reason in ('challenge_completed', 'achievement_unlocked')),
  attempt_id uuid references public.user_challenge_attempts (id) on delete set null,
  achievement_id text references public.achievements (id),
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index ledger_user_idx on public.points_ledger (user_id, created_at desc);

create table public.user_achievements (
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null references public.achievements (id),
  unlocked_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table public.card_discovery (
  user_id uuid not null references auth.users (id) on delete cascade,
  challenge_id text not null references public.challenges (id),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  times_seen integer not null default 1 check (times_seen > 0),
  primary key (user_id, challenge_id)
);

create table public.challenge_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id uuid not null references public.user_challenge_attempts (id) on delete cascade,
  kind text not null check (kind in ('photo', 'text')),
  -- Path inside the private "evidence" bucket: <user_id>/<attempt_id>/<file>
  storage_path text,
  mime_type text check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer check (size_bytes between 1 and 8388608),
  text_content text check (char_length(text_content) <= 2000),
  visibility text not null default 'private' check (visibility = 'private'),
  created_at timestamptz not null default now(),
  check (storage_path is null or storage_path like user_id::text || '/%')
);
create index evidence_attempt_idx on public.challenge_evidence (attempt_id);

-- Profile row on sign-up.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.user_profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
