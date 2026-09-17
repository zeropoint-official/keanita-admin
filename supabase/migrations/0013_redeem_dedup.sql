-- ============================================================
-- 0013: one purchase per unlockable item.
-- Gifts that unlock a permanent in-app item (item_key) may be redeemed
-- once per user; consumables (extra life) stay repeatable via the new
-- `consumable` flag.
-- ============================================================

alter table gifts add column if not exists consumable boolean not null default false;
update gifts set consumable = true where item_key = 'extra_life';

create or replace function redeem_gift(p_gift uuid, p_kid uuid default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare g gifts; bal int; led bigint; rid uuid; st redemption_status;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  perform pg_advisory_xact_lock(hashtext('points:' || auth.uid()::text));
  select * into g from gifts where id = p_gift and status = 'published' for update;
  if not found then raise exception 'gift not available'; end if;
  if g.item_key is not null and not g.consumable and exists (
    select 1 from redemptions r
    where r.user_id = auth.uid() and r.gift_id = p_gift and r.status not in ('rejected','cancelled')
  ) then raise exception 'already owned'; end if;
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
