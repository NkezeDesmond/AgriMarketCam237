alter table public.profiles
  add column if not exists onboarded boolean not null default false;

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles
for update
using (id = auth.uid() or public.is_admin())
with check ((public.is_admin()) or (id = auth.uid() and role <> 'admin'));

