-- ============================================================
-- 0012: users can always read gifts they have redeemed, even after the
-- gift is unpublished/archived — otherwise an owned cosmetic (item_key)
-- would disappear from the character studio when the catalog rotates.
-- ============================================================
create policy "gifts_redeemed_read" on gifts for select using (
  exists (select 1 from redemptions r where r.gift_id = gifts.id and r.user_id = auth.uid())
);
