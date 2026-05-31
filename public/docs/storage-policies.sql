drop policy if exists "listing_images_read" on storage.objects;
create policy "listing_images_read"
on storage.objects
for select
using (bucket_id = 'listing-images');

drop policy if exists "listing_images_insert_owner" on storage.objects;
create policy "listing_images_insert_owner"
on storage.objects
for insert
with check (
  bucket_id = 'listing-images'
  and (
    exists (
      select 1
      from public.listings l
      where l.id = (storage.foldername(name))[1]::uuid
        and l.farmer_id = auth.uid()
    )
  )
);

drop policy if exists "listing_images_update_owner" on storage.objects;
create policy "listing_images_update_owner"
on storage.objects
for update
using (
  bucket_id = 'listing-images'
  and (
    exists (
      select 1
      from public.listings l
      where l.id = (storage.foldername(name))[1]::uuid
        and l.farmer_id = auth.uid()
    )
  )
)
with check (
  bucket_id = 'listing-images'
  and (
    exists (
      select 1
      from public.listings l
      where l.id = (storage.foldername(name))[1]::uuid
        and l.farmer_id = auth.uid()
    )
  )
);

drop policy if exists "listing_images_delete_owner" on storage.objects;
create policy "listing_images_delete_owner"
on storage.objects
for delete
using (
  bucket_id = 'listing-images'
  and (
    exists (
      select 1
      from public.listings l
      where l.id = (storage.foldername(name))[1]::uuid
        and l.farmer_id = auth.uid()
    )
  )
);

