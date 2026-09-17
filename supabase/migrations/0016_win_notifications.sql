-- ============================================================
-- 0016 WIN NOTIFICATIONS: winning a sponsor gift writes an inbox
-- entry ("Κέρδισες: …" → Τα δώρα μου) inside the same transaction.
-- Full re-create of win_campaign_gift (0015) + the notification insert.
-- ============================================================

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

  -- inbox entry (RLS bypassed: security definer) — "Κέρδισες: …" → Τα δώρα μου
  insert into notifications (user_id, kid_id, title, body, type, link_type, link_target)
    values (auth.uid(), p_kid, 'Κέρδισες: ' || c.title,
            'Το δώρο από ' || coalesce((select name from sponsors where id = c.sponsor_id), 'τον χορηγό μας')
              || ' σε περιμένει! Δες στο προφίλ σου πώς θα το παραλάβεις.',
            'gift', 'screen', '/gifts-won');

  return a;
end $$;

revoke execute on function win_campaign_gift(uuid, uuid, jsonb) from public, anon;
grant execute on function win_campaign_gift(uuid, uuid, jsonb) to authenticated;
