-- ============================================================
-- 0009 SECURITY HARDENING (pre-launch audit fixes)
-- C1 points minting, C2 expiry corruption, H1 kid self-approval,
-- H2 public automation RPCs, H3/M1 redemption races, M2/M5/M6/L12 policy gaps,
-- L5 QR consumption, L6 ledger dedup.
-- ============================================================

-- ── H2: automation functions must not be callable by clients ──
revoke execute on function expire_kids() from public, anon, authenticated;
revoke execute on function expire_points() from public, anon, authenticated;
revoke execute on function enqueue_birthday_pushes() from public, anon, authenticated;
revoke execute on function enqueue_event_pushes() from public, anon, authenticated;
revoke execute on function invoke_send_push() from public, anon, authenticated;

-- ── L6/H2: ledger dedup gets a real constraint ──
delete from points_ledger a using points_ledger b
  where a.id > b.id and a.user_id = b.user_id and a.reason = b.reason and a.ref_id = b.ref_id and a.ref_id is not null;
create unique index if not exists points_ledger_dedup_idx on points_ledger (user_id, reason, ref_id) where ref_id is not null;

-- ── C1: earn_points — server-authoritative amounts, whitelisted reasons ──
create or replace function earn_points(p_reason points_reason, p_label text, p_amount integer default null, p_ref text default null, p_kid uuid default null)
returns integer language plpgsql security definer set search_path = public as $$
declare r reward_rules; amt int; today_sum int; expiry_months int; tier_max int; max_single int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  -- reasons users may never claim directly (staff/system paths insert into the ledger themselves)
  if p_reason in ('manual', 'refund', 'expiry', 'gift_redeem', 'birthday', 'event_rsvp') then return 0; end if;
  select * into r from reward_rules where key = p_reason and is_active;
  if not found then return 0; end if;
  select coalesce(max(v::int), 0) into tier_max from jsonb_each_text(coalesce(r.config->'tiers', '{}'::jsonb)) as t(k, v);
  max_single := coalesce(r.daily_cap, greatest(r.points, tier_max));
  amt := least(coalesce(p_amount, r.points), max_single);
  if r.daily_cap is not null then
    select coalesce(sum(amount),0) into today_sum from points_ledger
      where user_id = auth.uid() and reason = p_reason and created_at >= date_trunc('day', now());
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

-- ── C2: expire_points — mark processed rows, cap at balance, never repeat ──
alter table points_ledger add column if not exists expiry_processed_at timestamptz;
create or replace function expire_points() returns integer language plpgsql security definer set search_path = public as $$
declare u record; n int := 0; cap int;
begin
  for u in select user_id, array_agg(id) as ids, sum(amount) as total
           from points_ledger
           where amount > 0 and expires_at < now() and expiry_processed_at is null
           group by user_id
  loop
    cap := least(u.total, greatest(points_balance(u.user_id), 0));
    update points_ledger set expiry_processed_at = now() where id = any(u.ids);
    if cap > 0 then
      insert into points_ledger (user_id, amount, reason, label, ref_id)
        values (u.user_id, -cap, 'expiry', 'Λήξη πόντων', 'exp:' || u.ids[1]);
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke execute on function expire_points() from public, anon, authenticated;

-- ── H1: kids protect trigger must also cover INSERT ──
drop trigger if exists kids_protect on kids;
create or replace function kids_protect_status() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and not is_staff('editor') then
    if tg_op = 'INSERT' then
      new.status := 'pending'; new.member_id := null; new.reject_reason := null;
      new.approved_at := null; new.expired_at := null;
    else
      new.status := coalesce(old.status, 'pending');
      new.member_id := old.member_id;
      new.reject_reason := old.reject_reason;
      new.approved_at := old.approved_at;
      new.expired_at := old.expired_at;
    end if;
  end if;
  return new;
end $$;
create trigger kids_protect before insert or update on kids for each row execute function kids_protect_status();

-- ── H3: redeem_gift — lock gift row + per-user lock, atomic stock ──
create or replace function redeem_gift(p_gift uuid, p_kid uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare g gifts; bal int; led bigint; rid uuid; st redemption_status;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  perform pg_advisory_xact_lock(hashtext('points:' || auth.uid()::text));
  select * into g from gifts where id = p_gift and status = 'published' for update;
  if not found then raise exception 'gift not available'; end if;
  if g.stock is not null then
    update gifts set stock = stock - 1 where id = p_gift and stock > 0;
    if not found then raise exception 'out of stock'; end if;
  end if;
  bal := points_balance(auth.uid());
  if bal < g.cost then raise exception 'insufficient points'; end if;
  insert into points_ledger (user_id, kid_id, amount, reason, label, ref_id)
    values (auth.uid(), p_kid, -g.cost, 'gift_redeem', 'Εξαργύρωση: ' || g.name, null) returning id into led;
  st := case when g.requires_approval or g.category = 'physical' then 'requested' else 'approved' end;
  insert into redemptions (user_id, kid_id, gift_id, cost, status, ledger_id)
    values (auth.uid(), p_kid, p_gift, g.cost, st, led) returning id into rid;
  return rid;
end $$;

-- ── M1: transactional, idempotent redemption rejection ──
create or replace function reject_redemption(p_redemption uuid, p_note text, p_staff uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare r redemptions; g gifts;
begin
  update redemptions set status = 'rejected', note = p_note, handled_by = p_staff, handled_at = now()
    where id = p_redemption and status not in ('rejected', 'cancelled')
    returning * into r;
  if not found then return false; end if;
  select * into g from gifts where id = r.gift_id for update;
  insert into points_ledger (user_id, kid_id, amount, reason, label, ref_id, created_by)
    values (r.user_id, r.kid_id, r.cost, 'refund', 'Επιστροφή: ' || coalesce(g.name, 'δώρο'), 'refund:' || r.id, p_staff)
    on conflict do nothing;
  if g.stock is not null then update gifts set stock = stock + 1 where id = g.id; end if;
  return true;
end $$;
revoke execute on function reject_redemption(uuid, text, uuid) from public, anon, authenticated;

-- ── L5: scan_qr must not consume a code when no points are awarded ──
create or replace function scan_qr(p_code text) returns integer
language plpgsql security definer set search_path = public as $$
declare q qr_codes; amt int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into q from qr_codes where code = p_code for update;
  if not found then raise exception 'invalid code'; end if;
  if q.expires_at is not null and q.expires_at < now() then raise exception 'expired'; end if;
  if q.uses >= q.max_uses then raise exception 'already used'; end if;
  if exists (select 1 from qr_scans where code = p_code and user_id = auth.uid()) then raise exception 'already scanned'; end if;
  amt := earn_points('qr_scan', 'Σκανάρισμα QR', q.points, p_code);
  if amt <= 0 then raise exception 'no points available'; end if;   -- rolls back, code stays usable
  insert into qr_scans (code, user_id) values (p_code, auth.uid());
  update qr_codes set uses = uses + 1 where code = p_code;
  return amt;
end $$;

-- ── M5: event registration validated server-side ──
drop policy if exists "reg_insert" on event_registrations;
create policy "reg_insert" on event_registrations for insert with check (
  parent_id = auth.uid()
  and checked_in_at is null
  and (kid_id is null or exists (select 1 from kids k where k.id = kid_id and k.parent_id = auth.uid()))
  and exists (select 1 from events e where e.id = event_id and e.status = 'published' and e.allow_registration
              and (e.capacity is null or (select count(*) from event_registrations r where r.event_id = e.id) < e.capacity))
);

create or replace function register_for_event(p_event uuid, p_kid uuid default null)
returns integer language plpgsql security definer set search_path = public as $$
declare e events; amt int := 0; expiry_months int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into e from events where id = p_event and status = 'published' and allow_registration for update;
  if not found then raise exception 'registration closed'; end if;
  if e.capacity is not null and (select count(*) from event_registrations where event_id = p_event) >= e.capacity then
    raise exception 'event full';
  end if;
  if p_kid is not null and not exists (select 1 from kids where id = p_kid and parent_id = auth.uid()) then
    raise exception 'not your kid';
  end if;
  insert into event_registrations (event_id, parent_id, kid_id) values (p_event, auth.uid(), p_kid);
  if e.rsvp_points > 0 then
    select coalesce((value->>0)::int, 12) into expiry_months from app_settings where key = 'points_expiry_months';
    insert into points_ledger (user_id, kid_id, amount, reason, label, ref_id, expires_at)
      values (auth.uid(), p_kid, e.rsvp_points, 'event_rsvp', 'Δήλωση συμμετοχής — ' || e.title, 'rsvp:' || p_event || ':' || coalesce(p_kid::text, 'self'), now() + make_interval(months => coalesce(expiry_months, 12)))
      on conflict do nothing;
    amt := e.rsvp_points;
  end if;
  return amt;
end $$;

-- ── M2: contact_messages — viewers read, editors mutate, anon insert w/o impersonation (L12) ──
drop policy if exists "contact_insert" on contact_messages;
drop policy if exists "contact_staff" on contact_messages;
create policy "contact_insert" on contact_messages for insert with check (user_id is null or user_id = auth.uid());
create policy "contact_read"   on contact_messages for select using (is_staff());
create policy "contact_update" on contact_messages for update using (is_staff('editor')) with check (is_staff('editor'));
create policy "contact_delete" on contact_messages for delete using (is_staff('editor'));

-- ── M6: kids' avatars must not be world-readable ──
update storage.buckets set public = false where id = 'avatars';
drop policy if exists "public_read_media" on storage.objects;
create policy "public_read_media" on storage.objects for select
  using (bucket_id in ('events','products','stores','activities','characters','sliders','gifts','settings'));
create policy "avatars_staff_read" on storage.objects for select
  using (bucket_id = 'avatars' and is_staff());
