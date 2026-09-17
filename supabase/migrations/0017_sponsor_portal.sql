-- ============================================================
-- 0017 SPONSOR PORTAL: a 'sponsor' staff role that sees the absolute
-- minimum needed to hand over a gift — member ID + kid first name +
-- campaign + status, via sponsor_award_view — and can only redeem
-- awards of its own campaigns. Kids' PII never reaches sponsors.
-- NB: a value added to an enum cannot be referenced as a literal in the
-- same transaction, so every comparison below uses role::text.
-- ============================================================

alter type staff_role add value if not exists 'sponsor';
alter table staff add column if not exists sponsor_id uuid references sponsors(id);

-- is_staff() must NOT count sponsors as staff: the old CASE mapped any
-- unknown role to rank 0 (= viewer), which would have handed the sponsor
-- role read access to members, kids, redemptions — everything viewers see.
create or replace function is_staff(min_role staff_role default 'viewer') returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff s
    where s.id = auth.uid()
      and (case s.role::text when 'admin' then 2 when 'editor' then 1 when 'viewer' then 0 else -1 end)
          >= (case min_role::text when 'admin' then 2 when 'editor' then 1 when 'viewer' then 0 else 99 end)
  );
$$;

-- Sponsors are no longer is_staff(), but must still read their own staff row to log in.
create policy "staff_self_read" on staff for select using (id = auth.uid());

-- helper: the sponsor the logged-in user belongs to (null for everyone else)
create or replace function current_sponsor_id() returns uuid
language sql stable security definer set search_path = public as $$
  select sponsor_id from staff where id = auth.uid() and role::text = 'sponsor';
$$;
revoke execute on function current_sponsor_id() from public, anon;
grant execute on function current_sponsor_id() to authenticated;

-- Sponsor reads: own sponsor row + own campaigns (any status, for the portal gauges)
create policy "sponsors_sponsor_read" on sponsors for select using (id = current_sponsor_id());
create policy "sponsor_campaigns_sponsor_read" on sponsor_campaigns for select using (sponsor_id = current_sponsor_id());

-- The ONLY window a sponsor has into awards: minimal columns, own campaigns,
-- self-filtered inside the view (owner view bypasses awards RLS on purpose).
create or replace view sponsor_award_view as
  select a.id, a.status, a.won_at, a.expires_at, a.redeemed_at,
         k.member_id, k.first_name as kid_first_name,
         c.id as campaign_id, c.title as campaign_title, c.sponsor_id
  from awards a
  join sponsor_campaigns c on c.id = a.campaign_id
  left join kids k on k.id = a.kid_id
  where c.sponsor_id = current_sponsor_id();
revoke all on sponsor_award_view from public, anon;
grant select on sponsor_award_view to authenticated;

-- redeem_award: staff editor+ OR the sponsor that owns the award's campaign
create or replace function redeem_award(p_award uuid)
returns awards language plpgsql security definer set search_path = public as $$
declare a awards;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  select * into a from awards where id = p_award for update;
  if not found then raise exception 'award not found'; end if;
  if not (
    is_staff('editor')
    or exists (
      select 1 from sponsor_campaigns c
      where c.id = a.campaign_id and c.sponsor_id = current_sponsor_id()
    )
  ) then raise exception 'forbidden'; end if;
  if a.status <> 'won' then raise exception 'award not redeemable'; end if;
  if a.expires_at is not null and a.expires_at < now() then raise exception 'award expired'; end if;

  update awards set status = 'redeemed', redeemed_at = now(), redeemed_by = auth.uid()
    where id = a.id returning * into a;
  insert into audit_log (actor_id, action, entity, entity_id, payload)
    values (auth.uid(), 'award.redeem', 'awards', a.id::text,
            jsonb_build_object('campaign_id', a.campaign_id, 'user_id', a.user_id, 'kid_id', a.kid_id));
  return a;
end $$;

revoke execute on function redeem_award(uuid) from public, anon;
grant execute on function redeem_award(uuid) to authenticated;
