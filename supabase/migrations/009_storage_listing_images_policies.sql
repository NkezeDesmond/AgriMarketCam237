drop policy if exists "listing_images_public_read" on storage.objects;
create policy "listing_images_public_read"
on storage.objects
for select
using (bucket_id = 'listing-images');

drop policy if exists "listing_images_authenticated_insert" on storage.objects;
create policy "listing_images_authenticated_insert"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'listing-images' and owner = auth.uid());

drop policy if exists "listing_images_owner_delete" on storage.objects;
create policy "listing_images_owner_delete"
on storage.objects
for delete
to authenticated
using (bucket_id = 'listing-images' and owner = auth.uid());

