-- Lock down the coin-images bucket.
-- Previously: public bucket, single policy allowing any authenticated user to
-- upload anywhere. Photos were world-readable by URL and never cleaned up.
-- Now: private bucket with size/MIME limits; objects live under {userId}/...
-- and each user can only touch their own folder. Reads go through short-lived
-- signed URLs created by the app.

update storage.buckets
set
  public = false,
  file_size_limit = 5242880, -- 5 MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'coin-images';

drop policy if exists "Allow authenticated uploads 1x2iw50_0" on storage.objects;

create policy "coin-images insert own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'coin-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "coin-images select own folder"
on storage.objects for select to authenticated
using (
  bucket_id = 'coin-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "coin-images delete own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'coin-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
