-- ============================================================
-- 0029 In-app "Delete account" was failing for everyone.
--
-- Supabase now guards storage.objects with a statement-level trigger
-- (storage.protect_delete) that rejects ANY direct DELETE unless the
-- transaction sets storage.allow_delete_query = 'true'. delete_own_account()
-- starts by deleting the parent's avatar rows, so the whole call raised
-- "Direct deletion from storage tables is not allowed" — even with no files.
-- (Store requirement: Apple 5.1.1(v), Google Play account deletion.)
--
-- The guard exists to avoid orphaned files. No file can be orphaned here:
-- nothing uploads to the avatars bucket (0 objects; app and dashboard only
-- read signed URLs). If avatar uploads are ever added, delete the files
-- through the Storage API before calling this function.
-- ============================================================
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  -- never let a staff account nuke itself through the app path
  if exists (select 1 from staff where id = uid) then
    raise exception 'staff accounts must be removed by an admin';
  end if;
  update audit_log        set actor_id   = null where actor_id   = uid;
  update events           set created_by = null where created_by = uid;
  update points_ledger    set created_by = null where created_by = uid;
  update redemptions      set handled_by = null where handled_by = uid;
  update push_campaigns   set created_by = null where created_by = uid;
  update contact_messages set user_id    = null where user_id    = uid;
  -- kid avatar rows under avatars/{uid}/… (transaction-local opt-in, see header)
  perform set_config('storage.allow_delete_query', 'true', true);
  delete from storage.objects where bucket_id = 'avatars' and (storage.foldername(name))[1] = uid::text;
  -- GDPR record of the request (no PII beyond the already-anonymous id)
  insert into audit_log (actor_id, action, entity, entity_id, payload)
    values (null, 'account.self_delete', 'auth.users', uid::text, jsonb_build_object('at', now()));
  delete from auth.users where id = uid;
end $$;
