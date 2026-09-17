-- ============================================================
-- 0015 SPONSORS & GIFTS: sponsorships become content, not code.
-- Sponsors + campaigns are configured in the dashboard; the app reads
-- active campaigns and wins are recorded through win_campaign_gift().
-- Stock is derived (never stored): remaining = quota − live awards.
-- Sponsor portal role ships later (Phase 3 migration), not here.
-- NB: the design doc's `campaign_status` enum is named
-- `sponsor_campaign_status` here — `campaign_status` already belongs
-- to push_campaigns (0004).
-- ============================================================

-- ── enums ──
create type sponsor_status          as enum ('draft','active','archived');
create type sponsor_campaign_status as enum ('draft','active','paused','ended');
create type campaign_trigger        as enum ('game_milestone','game_drop','kp_claim','streak','event_attendance','manual');
create type fulfillment_kind        as enum ('pickup','code');
create type quota_mode              as enum ('total','monthly','weekly');
create type award_status            as enum ('won','redeemed','expired','revoked');

-- ── tables ──
create table sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_path text,                    -- storage: sponsors/ bucket (public read, staff write)
  brand_color text,                  -- hex, gift card accent in the app
  status sponsor_status not null default 'draft',
  contact_name text, contact_email text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger sponsors_updated before update on sponsors for each row execute function set_updated_at();

create table sponsor_campaigns (
  id uuid primary key default gen_random_uuid(),
  sponsor_id uuid not null references sponsors(id) on delete cascade,
  title text not null,               -- "Δωρεάν εισιτήριο K Cineplex"
  prize_image_path text,             -- optional; app falls back to sponsor logo
  profile_text text not null,        -- what the winner reads (how/where to redeem)
  redeem_link text,
  status sponsor_campaign_status not null default 'draft',
  starts_at timestamptz, ends_at timestamptz,
  trigger campaign_trigger not null,
  trigger_config jsonb not null default '{}',
    -- game_milestone: {"every_points": 10}   game_drop: {"chance": 0.05}
    -- kp_claim: {"kp_cost": 200}             streak: {"days": 7}
  fulfillment fulfillment_kind not null,
  quota_mode quota_mode not null default 'total',
  quota_amount integer not null check (quota_amount > 0),   -- per period when mode != total
  per_user_limit integer not null default 1 check (per_user_limit > 0),
  requirements jsonb not null default '{}',
    -- {"kid_approved": true, "min_age": 4, "max_age": 11, "min_kp": 0, "max_wins_per_day": 1}
  expiry_days integer,               -- null = never; else won→expired after N days (stock returns)
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger sponsor_campaigns_updated before update on sponsor_campaigns for each row execute function set_updated_at();
create index sponsor_campaigns_status_idx on sponsor_campaigns(status, trigger);

-- coupon codes for fulfillment = 'code' (uploaded in batches from the dashboard)
create table campaign_codes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references sponsor_campaigns(id) on delete cascade,
  code text not null,
  batch_label text,                  -- e.g. "KFC Οκτώβριος"
  award_id uuid,                     -- set when assigned to a winner (FK added below)
  unique (campaign_id, code)
);
create index campaign_codes_free_idx on campaign_codes(campaign_id) where award_id is null;

create table awards (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references sponsor_campaigns(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  kid_id uuid references kids(id) on delete set null,
  status award_status not null default 'won',
  code_id uuid references campaign_codes(id),
  won_at timestamptz not null default now(),
  expires_at timestamptz,            -- won_at + expiry_days
  redeemed_at timestamptz,
  redeemed_by uuid references auth.users(id),   -- staff (later: sponsor user)
  trigger_snapshot jsonb             -- what won it, for the audit trail
);
create index awards_campaign_status_idx on awards(campaign_id, status);
create index awards_user_idx on awards(user_id, won_at desc);
create index awards_campaign_user_idx on awards(campaign_id, user_id);

alter table campaign_codes
  add constraint campaign_codes_award_fk foreign key (award_id) references awards(id) on delete set null;

-- ── RLS ──
alter table sponsors          enable row level security;
alter table sponsor_campaigns enable row level security;
alter table campaign_codes    enable row level security;
alter table awards            enable row level security;

create policy "sponsors_staff_all" on sponsors for all using (is_staff('editor')) with check (is_staff('editor'));
create policy "sponsors_public_read" on sponsors for select using (status = 'active' or is_staff());

create policy "sponsor_campaigns_staff_all" on sponsor_campaigns for all using (is_staff('editor')) with check (is_staff('editor'));
create policy "sponsor_campaigns_public_read" on sponsor_campaigns for select using (status = 'active' or is_staff());

create policy "campaign_codes_staff_all" on campaign_codes for all using (is_staff('editor')) with check (is_staff('editor'));
-- winners read only the code assigned to their own award
create policy "campaign_codes_winner_read" on campaign_codes for select
  using (exists (select 1 from awards a where a.id = campaign_codes.award_id and a.user_id = auth.uid()));

-- parents read their own awards; all writes go through the RPCs below
create policy "awards_own_read" on awards for select using (user_id = auth.uid() or is_staff());

-- ── storage: sponsors bucket (public read, staff write) ──
insert into storage.buckets (id, name, public) values ('sponsors','sponsors',true) on conflict (id) do nothing;
drop policy if exists "public_read_media" on storage.objects;
create policy "public_read_media" on storage.objects for select
  using (bucket_id in ('events','products','stores','activities','characters','sliders','gifts','settings','sponsors'));
drop policy if exists "staff_write_media" on storage.objects;
create policy "staff_write_media" on storage.objects for all
  using (is_staff('editor') and bucket_id in ('events','products','stores','activities','characters','sliders','gifts','settings','sponsors'))
  with check (is_staff('editor') and bucket_id in ('events','products','stores','activities','characters','sliders','gifts','settings','sponsors'));

-- ── RPC: win_campaign_gift — the only way an award is created ──
-- Atomic under a per-campaign advisory lock: stock can never over-award,
-- codes are assigned exactly once. Amounts/limits are server-authoritative.
create or replace function win_campaign_gift(p_campaign uuid, p_kid uuid default null, p_context jsonb default '{}')
returns awards language plpgsql security definer set search_path = public as $$
declare
  c sponsor_campaigns; k kids; a awards;
  aid uuid := gen_random_uuid();
  cid uuid;
  cost int; used int; day_cap int; n int;
  period_start timestamptz;
  local_day date := (now() at time zone 'Asia/Nicosia')::date;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;

  -- one winner at a time per campaign
  perform pg_advisory_xact_lock(hashtext('campaign:' || p_campaign::text));

  select * into c from sponsor_campaigns where id = p_campaign and status = 'active';
  if not found then raise exception 'campaign not available'; end if;
  if (c.starts_at is not null and now() < c.starts_at)
     or (c.ends_at is not null and now() > c.ends_at) then
    raise exception 'campaign not available';
  end if;
  if not exists (select 1 from sponsors s where s.id = c.sponsor_id and s.status = 'active') then
    raise exception 'campaign not available';
  end if;

  -- requirements
  if coalesce((c.requirements->>'kid_approved')::boolean, false) and p_kid is null then
    raise exception 'kid required';
  end if;
  if p_kid is not null then
    select * into k from kids where id = p_kid and parent_id = auth.uid();
    if not found then raise exception 'kid not found'; end if;
    if coalesce((c.requirements->>'kid_approved')::boolean, false) and k.status <> 'approved' then
      raise exception 'kid not approved';
    end if;
    if c.requirements ? 'min_age' and date_part('year', age(k.dob))::int < (c.requirements->>'min_age')::int then
      raise exception 'age requirement not met';
    end if;
    if c.requirements ? 'max_age' and date_part('year', age(k.dob))::int > (c.requirements->>'max_age')::int then
      raise exception 'age requirement not met';
    end if;
  end if;
  if c.requirements ? 'min_kp' and points_balance(auth.uid()) < (c.requirements->>'min_kp')::int then
    raise exception 'insufficient points';
  end if;

  -- per-user limit (expired/revoked wins do not count — their stock returned)
  select count(*) into n from awards
    where campaign_id = c.id and user_id = auth.uid() and status in ('won','redeemed');
  if n >= c.per_user_limit then raise exception 'limit reached'; end if;

  -- game triggers are client-reported (same trust model as game_scores):
  -- cap wins per user per Cyprus day, default 1
  if c.trigger in ('game_milestone','game_drop') then
    day_cap := coalesce((c.requirements->>'max_wins_per_day')::int, 1);
    select count(*) into n from awards
      where campaign_id = c.id and user_id = auth.uid() and status <> 'revoked'
        and (won_at at time zone 'Asia/Nicosia')::date = local_day;
    if n >= day_cap then raise exception 'daily limit reached'; end if;
  end if;

  -- stock: derived, period-aware (Cyprus calendar month / ISO week)
  if c.quota_mode = 'monthly' then
    period_start := date_trunc('month', now() at time zone 'Asia/Nicosia') at time zone 'Asia/Nicosia';
  elsif c.quota_mode = 'weekly' then
    period_start := date_trunc('week', now() at time zone 'Asia/Nicosia') at time zone 'Asia/Nicosia';
  end if;
  select count(*) into used from awards a2
    where a2.campaign_id = c.id and a2.status in ('won','redeemed')
      and (c.quota_mode = 'total' or a2.won_at >= period_start);
  if used >= c.quota_amount then raise exception 'out of stock'; end if;

  -- kp_claim spends KP through the ledger, under the per-user points lock
  if c.trigger = 'kp_claim' then
    cost := coalesce((c.trigger_config->>'kp_cost')::int, 0);
    if cost <= 0 then raise exception 'campaign not available'; end if;
    perform pg_advisory_xact_lock(hashtext('points:' || auth.uid()::text));
    if points_balance(auth.uid()) < cost then raise exception 'insufficient points'; end if;
    insert into points_ledger (user_id, kid_id, amount, reason, label, ref_id)
      values (auth.uid(), p_kid, -cost, 'gift_redeem', 'Εξαργύρωση: ' || c.title, 'award:' || aid::text);
  end if;

  -- code fulfillment: no free code = no win
  if c.fulfillment = 'code' then
    select id into cid from campaign_codes
      where campaign_id = c.id and award_id is null order by id limit 1;
    if cid is null then raise exception 'out of stock'; end if;
  end if;

  insert into awards (id, campaign_id, user_id, kid_id, code_id, expires_at, trigger_snapshot)
    values (aid, c.id, auth.uid(), p_kid, cid,
            case when c.expiry_days is not null then now() + make_interval(days => c.expiry_days) end,
            jsonb_build_object('trigger', c.trigger, 'config', c.trigger_config,
                               'context', coalesce(p_context, '{}'::jsonb)))
    returning * into a;
  if cid is not null then update campaign_codes set award_id = aid where id = cid; end if;
  return a;
end $$;

revoke execute on function win_campaign_gift(uuid, uuid, jsonb) from public, anon;
grant execute on function win_campaign_gift(uuid, uuid, jsonb) to authenticated;

-- ── RPC: campaign_stock — remaining stock for the current period ──
-- Parents can only read their own awards, so the app (and the dashboard
-- gauge) gets the derived remaining count from here.
create or replace function campaign_stock(p_campaign uuid) returns integer
language plpgsql stable security definer set search_path = public as $$
declare c sponsor_campaigns; used int; period_start timestamptz;
begin
  select * into c from sponsor_campaigns where id = p_campaign;
  if not found then return 0; end if;
  if c.quota_mode = 'monthly' then
    period_start := date_trunc('month', now() at time zone 'Asia/Nicosia') at time zone 'Asia/Nicosia';
  elsif c.quota_mode = 'weekly' then
    period_start := date_trunc('week', now() at time zone 'Asia/Nicosia') at time zone 'Asia/Nicosia';
  end if;
  select count(*) into used from awards a
    where a.campaign_id = c.id and a.status in ('won','redeemed')
      and (c.quota_mode = 'total' or a.won_at >= period_start);
  return greatest(c.quota_amount - used, 0);
end $$;

revoke execute on function campaign_stock(uuid) from public, anon;
grant execute on function campaign_stock(uuid) to authenticated;

-- ── RPC: redeem_award — staff hand over the gift ──
-- Auth-based (not service-role) so the Phase-3 sponsor role can call it
-- with its own session; writes its own audit row.
create or replace function redeem_award(p_award uuid)
returns awards language plpgsql security definer set search_path = public as $$
declare a awards;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not is_staff('editor') then raise exception 'forbidden'; end if;

  select * into a from awards where id = p_award for update;
  if not found then raise exception 'award not found'; end if;
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

-- ── cron: expire overdue wins (stock frees automatically — it's derived) ──
create or replace function expire_awards() returns integer
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update awards set status = 'expired'
    where status = 'won' and expires_at is not null and expires_at < now();
  get diagnostics n = row_count;
  return n;
end $$;

revoke execute on function expire_awards() from public, anon, authenticated;
select cron.schedule('expire-awards', '20 * * * *', $$select expire_awards()$$);
