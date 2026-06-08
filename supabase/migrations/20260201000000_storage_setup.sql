-- Guilt_ marketplace — Supabase Storage buckets and policies.
-- Run after schema.sql. Buckets are public-read; uploads/updates/deletes require auth.

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('store-images', 'store-images', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read for all three image buckets.
create policy "public read images"
on storage.objects
for select
using (bucket_id in ('product-images', 'store-images', 'avatars'));

-- Authenticated users may upload.
create policy "authenticated upload images"
on storage.objects
for insert
to authenticated
with check (bucket_id in ('product-images', 'store-images', 'avatars'));

-- Authenticated users may update objects (kept simple; tighten with owner path later).
create policy "authenticated update images"
on storage.objects
for update
to authenticated
using (bucket_id in ('product-images', 'store-images', 'avatars'))
with check (bucket_id in ('product-images', 'store-images', 'avatars'));

-- Authenticated users may delete objects (kept simple; tighten with owner path later).
create policy "authenticated delete images"
on storage.objects
for delete
to authenticated
using (bucket_id in ('product-images', 'store-images', 'avatars'));
