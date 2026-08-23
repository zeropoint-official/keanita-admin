-- ============================================================
-- 0005 RLS: public read of published content, own-data for parents, staff by role
-- ============================================================
-- Content tables: anyone can read published; editors+ write.
do $$
declare t text;
begin
  foreach t in array array['events','products','stores','store_discounts','activities','characters','home_sliders','gifts','pages','store_categories']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "%1$s_staff_all" on %1$I for all using (is_staff(''editor'')) with check (is_staff(''editor''))', t);
  end loop;
end $$;

create policy "events_public_read"      on events      for select using (status = 'published' or is_staff());
create policy "products_public_read"    on products    for select using (status = 'published' or is_staff());
create policy "stores_public_read"      on stores      for select using (status = 'published' or is_staff());
create policy "store_discounts_public_read" on store_discounts for select using (true);
create policy "store_categories_public_read" on store_categories for select using (true);
create policy "activities_public_read"  on activities  for select using (status = 'published' or is_staff());
create policy "characters_public_read"  on characters  for select using (status = 'published' or is_staff());
create policy "home_sliders_public_read" on home_sliders for select using (status = 'published' or is_staff());
create policy "gifts_public_read"       on gifts       for select using (status = 'published' or is_staff());
create policy "pages_public_read"       on pages       for select using (true);

-- settings & rules: public read, admin write
alter table app_settings enable row level security;
create policy "settings_read"  on app_settings for select using (true);
create policy "settings_admin" on app_settings for all using (is_staff('admin')) with check (is_staff('admin'));
alter table reward_rules enable row level security;
create policy "rules_read"  on reward_rules for select using (true);
create policy "rules_admin" on reward_rules for all using (is_staff('admin')) with check (is_staff('admin'));

-- profiles
-- profiles: "profiles_select_own" / "profiles_update_own" already exist from the auth migration; add staff access
alter table profiles enable row level security;
create policy "profiles_staff" on profiles for all using (is_staff('editor')) with check (is_staff('editor'));

-- kids: parents manage their own (but cannot set status/member_id — enforced by trigger below)
alter table kids enable row level security;
create policy "kids_parent_select" on kids for select using (parent_id = auth.uid() or is_staff());
create policy "kids_parent_insert" on kids for insert with check (parent_id = auth.uid());
create policy "kids_parent_update" on kids for update using (parent_id = auth.uid()) with check (parent_id = auth.uid());
create policy "kids_parent_delete" on kids for delete using (parent_id = auth.uid());
create policy "kids_staff"         on kids for all using (is_staff('editor')) with check (is_staff('editor'));

create or replace function kids_protect_status() returns trigger language plpgsql as $$
begin
  if not is_staff('editor') and auth.uid() is not null then
    new.status := coalesce(old.status, 'pending');
    new.member_id := old.member_id;
    new.reject_reason := old.reject_reason;
    new.approved_at := old.approved_at;
    new.expired_at := old.expired_at;
  end if;
  return new;
end $$;
create trigger kids_protect before update on kids for each row execute function kids_protect_status();

-- staff table: staff can read; only admins change
alter table staff enable row level security;
create policy "staff_read"  on staff for select using (is_staff());
create policy "staff_admin" on staff for all using (is_staff('admin')) with check (is_staff('admin'));

-- audit log: staff read; inserts via service role only
alter table audit_log enable row level security;
create policy "audit_read" on audit_log for select using (is_staff());

-- event registrations
alter table event_registrations enable row level security;
create policy "reg_own"   on event_registrations for select using (parent_id = auth.uid() or is_staff());
create policy "reg_insert" on event_registrations for insert with check (parent_id = auth.uid());
create policy "reg_delete" on event_registrations for delete using (parent_id = auth.uid());
create policy "reg_staff" on event_registrations for all using (is_staff('editor')) with check (is_staff('editor'));

-- points ledger: users read own; writes only through RPC / service role
alter table points_ledger enable row level security;
create policy "ledger_own"   on points_ledger for select using (user_id = auth.uid() or is_staff());

-- redemptions: users read own + create; staff handle
alter table redemptions enable row level security;
create policy "redemption_own"    on redemptions for select using (user_id = auth.uid() or is_staff());
create policy "redemption_staff"  on redemptions for update using (is_staff('editor')) with check (is_staff('editor'));

-- qr
alter table qr_codes enable row level security;
create policy "qr_staff" on qr_codes for all using (is_staff('editor')) with check (is_staff('editor'));
alter table qr_scans enable row level security;
create policy "qr_scans_own" on qr_scans for select using (user_id = auth.uid() or is_staff());

-- game scores
alter table game_scores enable row level security;
create policy "scores_own"    on game_scores for select using (user_id = auth.uid() or is_staff());
create policy "scores_insert" on game_scores for insert with check (user_id = auth.uid());

-- device tokens
alter table device_tokens enable row level security;
create policy "tokens_own" on device_tokens for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "tokens_staff_read" on device_tokens for select using (is_staff());

-- campaigns: staff only
alter table push_campaigns enable row level security;
create policy "campaigns_staff" on push_campaigns for all using (is_staff('editor')) with check (is_staff('editor'));

-- notifications inbox
alter table notifications enable row level security;
create policy "notif_own"        on notifications for select using (user_id = auth.uid() or is_staff());
create policy "notif_own_update" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notif_own_delete" on notifications for delete using (user_id = auth.uid());
create policy "notif_staff"      on notifications for all using (is_staff('editor')) with check (is_staff('editor'));

-- contact messages
alter table contact_messages enable row level security;
create policy "contact_insert" on contact_messages for insert with check (true);
create policy "contact_staff"  on contact_messages for all using (is_staff()) with check (is_staff('editor'));

-- ============ RPCs the app calls (security definer, validated server-side) ============

-- earn points with rule lookup + daily cap
create or replace function earn_points(p_reason points_reason, p_label text, p_amount integer default null, p_ref text default null, p_kid uuid default null)
returns integer language plpgsql security definer set search_path = public as $$
declare r reward_rules; amt int; today_sum int; expiry_months int;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into r from reward_rules where key = p_reason and is_active;
  if not found then return 0; end if;
  amt := coalesce(p_amount, r.points);
  if r.daily_cap is not null then
    select coalesce(sum(amount),0) into today_sum from points_ledger
      where user_id = auth.uid() and reason = p_reason and created_at >= date_trunc('day', now());
    amt := least(amt, greatest(r.daily_cap - today_sum, 0));
  end if;
  if amt <= 0 then return 0; end if;
  -- one-off reasons can't repeat for same ref
  if p_ref is not null and exists (select 1 from points_ledger where user_id = auth.uid() and reason = p_reason and ref_id = p_ref) then
    return 0;
  end if;
  select coalesce((value->>0)::int, 12) into expiry_months from app_settings where key = 'points_expiry_months';
  insert into points_ledger (user_id, kid_id, amount, reason, label, ref_id, expires_at)
    values (auth.uid(), p_kid, amt, p_reason, p_label, p_ref, now() + make_interval(months => coalesce(expiry_months,12)));
  return amt;
end $$;

-- redeem a gift: deducts points, creates redemption (auto-approved for digital w/o approval)
create or replace function redeem_gift(p_gift uuid, p_kid uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare g gifts; bal int; led bigint; rid uuid; st redemption_status;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into g from gifts where id = p_gift and status = 'published';
  if not found then raise exception 'gift not available'; end if;
  if g.stock is not null and g.stock <= 0 then raise exception 'out of stock'; end if;
  bal := points_balance(auth.uid());
  if bal < g.cost then raise exception 'insufficient points'; end if;
  insert into points_ledger (user_id, kid_id, amount, reason, label, ref_id)
    values (auth.uid(), p_kid, -g.cost, 'gift_redeem', 'Εξαργύρωση: ' || g.name, p_gift) returning id into led;
  st := case when g.requires_approval or g.category = 'physical' then 'requested' else 'approved' end;
  insert into redemptions (user_id, kid_id, gift_id, cost, status, ledger_id)
    values (auth.uid(), p_kid, p_gift, g.cost, st, led) returning id into rid;
  if g.stock is not null then update gifts set stock = stock - 1 where id = p_gift; end if;
  return rid;
end $$;

-- scan a QR code
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
  insert into qr_scans (code, user_id) values (p_code, auth.uid());
  update qr_codes set uses = uses + 1 where code = p_code;
  amt := earn_points('qr_scan', 'Σκανάρισμα QR', q.points, p_code);
  return amt;
end $$;
