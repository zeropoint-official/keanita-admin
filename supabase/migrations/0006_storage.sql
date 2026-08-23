-- ============================================================
-- 0006 STORAGE buckets (public read; staff write)
-- ============================================================
insert into storage.buckets (id, name, public) values
  ('events','events',true), ('products','products',true), ('stores','stores',true),
  ('activities','activities',true), ('characters','characters',true), ('sliders','sliders',true),
  ('gifts','gifts',true), ('avatars','avatars',true), ('settings','settings',true)
on conflict (id) do nothing;

create policy "public_read_media" on storage.objects for select
  using (bucket_id in ('events','products','stores','activities','characters','sliders','gifts','avatars','settings'));

create policy "staff_write_media" on storage.objects for all
  using (is_staff('editor') and bucket_id in ('events','products','stores','activities','characters','sliders','gifts','settings'))
  with check (is_staff('editor') and bucket_id in ('events','products','stores','activities','characters','sliders','gifts','settings'));

-- users upload their own avatars under avatars/{uid}/...
create policy "own_avatar_write" on storage.objects for all
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
