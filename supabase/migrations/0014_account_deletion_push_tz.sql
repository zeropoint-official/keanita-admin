-- ============================================================
-- 0014 ACCOUNT DELETION + PUSH TOKEN RE-REGISTRATION + TIMEZONE FIXES
-- (pre-store-submission audit fixes, 2026-09)
-- ============================================================

-- ── A: in-app account deletion (Apple 5.1.1(v) / Play User Data policy) ──
-- Deletes the caller's auth.users row; profiles/kids/points_ledger/redemptions/
-- device_tokens/notifications/game_scores/event_registrations all cascade via
-- profiles(id). References that intentionally do NOT cascade (audit trail,
-- staff-ish columns) are detached first so the delete can't be blocked.
create or replace function delete_own_account() returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  -- never let a staff account nuke itself through the app path
  if exists (select 1 from staff where id = uid) then
    raise exception 'staff accounts must be removed by an admin';
  end if;
  update audit_log       set actor_id   = null where actor_id   = uid;
  update events          set created_by = null where created_by = uid;
  update points_ledger   set created_by = null where created_by = uid;
  update redemptions     set handled_by = null where handled_by = uid;
  update push_campaigns  set created_by = null where created_by = uid;
  update contact_messages set user_id   = null where user_id    = uid;
  -- kid avatar files under avatars/{uid}/…
  delete from storage.objects where bucket_id = 'avatars' and (storage.foldername(name))[1] = uid::text;
  -- GDPR record of the request (no PII beyond the already-anonymous id)
  insert into audit_log (actor_id, action, entity, entity_id, payload)
    values (null, 'account.self_delete', 'auth.users', uid::text, jsonb_build_object('at', now()));
  delete from auth.users where id = uid;
end $$;
revoke execute on function delete_own_account() from public, anon;
grant execute on function delete_own_account() to authenticated;

-- ── B: device token registration that survives device hand-me-downs ──
-- The client upsert fails RLS when the token row still belongs to a previous
-- user of the same phone; this SECURITY DEFINER path reassigns it instead.
create or replace function register_device_token(p_token text, p_platform text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_platform not in ('ios','android','web') then raise exception 'invalid platform'; end if;
  if p_token !~ '^(ExponentPushToken\[|ExpoPushToken\[)' then raise exception 'invalid token'; end if;
  insert into device_tokens (token, user_id, platform, last_seen_at)
    values (p_token, auth.uid(), p_platform, now())
    on conflict (token) do update
      set user_id = excluded.user_id, platform = excluded.platform, last_seen_at = now();
end $$;
revoke execute on function register_device_token(text, text) from public, anon;
grant execute on function register_device_token(text, text) to authenticated;

-- ── C: earn_points — Cyprus-local day for caps + server-owned daily_login ref ──
-- Fixes the 00:00–03:00 local/UTC split-brain that could double-mint the daily
-- bonus. Same economy, same caps; only the day boundary moves to Asia/Nicosia
-- and the daily_login dedup ref is now computed server-side.
create or replace function earn_points(p_reason points_reason, p_label text, p_amount integer default null, p_ref text default null, p_kid uuid default null)
returns integer language plpgsql security definer set search_path = public as $$
declare r reward_rules; amt int; today_sum int; expiry_months int; tier_max int; max_single int;
        local_day date := (now() at time zone 'Asia/Nicosia')::date;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_reason in ('manual', 'refund', 'expiry', 'gift_redeem', 'birthday', 'event_rsvp') then return 0; end if;
  -- the daily-login dedup key is server truth, not client clock
  if p_reason = 'daily_login' then p_ref := 'login:' || to_char(local_day, 'YYYY-MM-DD'); end if;
  select * into r from reward_rules where key = p_reason and is_active;
  if not found then return 0; end if;
  select coalesce(max(v::int), 0) into tier_max from jsonb_each_text(coalesce(r.config->'tiers', '{}'::jsonb)) as t(k, v);
  max_single := coalesce(r.daily_cap, greatest(r.points, tier_max));
  amt := least(coalesce(p_amount, r.points), max_single);
  if r.daily_cap is not null then
    select coalesce(sum(amount),0) into today_sum from points_ledger
      where user_id = auth.uid() and reason = p_reason
        and (created_at at time zone 'Asia/Nicosia')::date = local_day;
    amt := least(amt, greatest(r.daily_cap - today_sum, 0));
  end if;
  if amt <= 0 then return 0; end if;
  if p_ref is not null and exists (select 1 from points_ledger where user_id = auth.uid() and reason = p_reason and ref_id = p_ref) then
    return 0;
  end if;
  select coalesce((value->>0)::int, 12) into expiry_months from app_settings where key = 'points_expiry_months';
  perform pg_advisory_xact_lock(hashtext('points:' || auth.uid()::text));
  insert into points_ledger (user_id, kid_id, amount, reason, label, ref_id, expires_at)
    values (auth.uid(), p_kid, amt, p_reason, p_label, p_ref, now() + make_interval(months => coalesce(expiry_months,12)))
    on conflict do nothing;
  return amt;
end $$;

-- ── D: close the unlimited-minting gap when a rule has no daily_cap ──
-- earn_points caps per-call and per-day *only* when daily_cap is set. Make the
-- client-claimable rules always capped (idempotent; keeps any existing cap).
update reward_rules set daily_cap = coalesce(daily_cap, greatest(points, 1) * 5)
  where key in ('game', 'qr_scan') and daily_cap is null;
