alter table public.profiles
add column if not exists first_name text,
add column if not exists last_name text,
add column if not exists address text,
add column if not exists references_text text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
on storage.objects
for select
using (bucket_id = 'avatars');

drop policy if exists "avatars_authenticated_insert" on storage.objects;
create policy "avatars_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists "avatars_owner_update" on storage.objects;
create policy "avatars_owner_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'avatars' and owner = auth.uid())
with check (bucket_id = 'avatars' and owner = auth.uid());

drop policy if exists "avatars_owner_delete" on storage.objects;
create policy "avatars_owner_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'avatars' and owner = auth.uid());

