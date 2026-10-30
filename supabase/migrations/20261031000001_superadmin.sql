-- Superadmin role. RLS is the real gate: the /admin screen only reflects it.
-- Accounts are added by hand from the SQL Editor; nothing in the app can grant the role.

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'superadmin' check (role = 'superadmin'),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

create policy "own admin row read" on public.admin_users for select to authenticated
  using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.admin_users from anon, authenticated;

create function public.is_superadmin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_users a where a.user_id = auth.uid());
$$;

revoke all on function public.is_superadmin() from public, anon;
grant execute on function public.is_superadmin() to authenticated;

-- Catalogue editing. No delete: attempts reference challenges, so retire with available = false.
grant insert, update on public.challenges to authenticated;

create policy "superadmin insert" on public.challenges for insert to authenticated
  with check ((select public.is_superadmin()));
create policy "superadmin update" on public.challenges for update to authenticated
  using ((select public.is_superadmin())) with check ((select public.is_superadmin()));
