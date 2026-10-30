-- App versions managed from /admin. Exactly one is active; everyone can read them.

create table public.app_versions (
  id text primary key check (char_length(id) between 1 and 20),
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index app_versions_one_active on public.app_versions (is_active) where is_active;

alter table public.app_versions enable row level security;

create policy "versions read" on public.app_versions for select using (true);
create policy "superadmin insert" on public.app_versions for insert to authenticated
  with check ((select public.is_superadmin()));

revoke insert, update, delete on public.app_versions from anon, authenticated;
grant insert (id) on public.app_versions to authenticated;

insert into public.app_versions (id, is_active) values ('0.1', true);

-- Switches the active version in one transaction.
create function public.set_active_version(p_id text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_superadmin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.app_versions where id = p_id) then
    raise exception 'unknown version' using errcode = 'P0002';
  end if;
  update public.app_versions set is_active = false where is_active and id <> p_id;
  update public.app_versions set is_active = true where id = p_id;
end;
$$;

revoke all on function public.set_active_version(text) from public, anon;
grant execute on function public.set_active_version(text) to authenticated;
