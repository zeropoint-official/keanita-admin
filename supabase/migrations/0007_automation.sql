-- ============================================================
-- 0007 AUTOMATION: kid expiry, point expiry, birthday & reminder campaign enqueueing
-- (actual push delivery = Edge Function `send-push` polling push_campaigns.status='scheduled')
-- ============================================================

-- kids turning the max age (setting kid_max_age, default 11) → expired
create or replace function expire_kids() returns integer language plpgsql security definer set search_path = public as $$
declare max_age int; n int;
begin
  select coalesce((value->>0)::int, 11) into max_age from app_settings where key = 'kid_max_age';
  with upd as (
    update kids set status = 'expired', expired_at = now()
    where status = 'approved' and dob <= (current_date - make_interval(years => coalesce(max_age,11)))
    returning 1)
  select count(*) into n from upd;
  return n;
end $$;

-- expired points → negative balancing entry
create or replace function expire_points() returns integer language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with exp as (
    select user_id, sum(amount) as total from points_ledger
    where amount > 0 and expires_at < now() and not exists (
      select 1 from points_ledger e where e.reason = 'expiry' and e.ref_id = 'exp:' || points_ledger.id::text)
    group by user_id),
  ins as (
    insert into points_ledger (user_id, amount, reason, label, ref_id)
    select user_id, -least(total, greatest(points_balance(user_id),0)), 'expiry', 'Λήξη πόντων', 'exp:batch:' || to_char(now(),'YYYYMMDD')
    from exp where total > 0 returning 1)
  select count(*) into n from ins;
  return n;
end $$;

-- birthday campaign per kid (today)
create or replace function enqueue_birthday_pushes() returns integer language plpgsql security definer set search_path = public as $$
declare k record; n int := 0; tpl text; pts int;
begin
  select coalesce(value->>0, 'Χρόνια πολλά {name}! 🎂 Η Keanita σου εύχεται μια υπέροχη μέρα!') into tpl from app_settings where key = 'birthday_message';
  select coalesce((value->>0)::int, 0) into pts from app_settings where key = 'birthday_points';
  if not coalesce((select (value->>0)::boolean from app_settings where key = 'birthday_push_enabled'), true) then return 0; end if;
  for k in select kids.id, kids.first_name, kids.parent_id from kids
           where status = 'approved' and to_char(dob,'MM-DD') = to_char(current_date,'MM-DD')
  loop
    insert into push_campaigns (title, body, type, audience, scheduled_at, status, source)
      values ('Χρόνια πολλά ' || k.first_name || '! 🎉', replace(tpl, '{name}', k.first_name), 'birthday',
              jsonb_build_object('user_ids', jsonb_build_array(k.parent_id), 'kid_id', k.id), now(), 'scheduled', 'birthday');
    if pts > 0 then
      insert into points_ledger (user_id, kid_id, amount, reason, label, ref_id, expires_at)
        values (k.parent_id, k.id, pts, 'birthday', 'Δώρο γενεθλίων 🎂', 'bday:' || k.id || ':' || extract(year from now()), now() + interval '12 months')
        on conflict do nothing;
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

-- event reminders (lead days setting) + event announcement pushes (notify_on)
create or replace function enqueue_event_pushes() returns integer language plpgsql security definer set search_path = public as $$
declare e record; n int := 0; lead int;
begin
  select coalesce((value->>0)::int, 2) into lead from app_settings where key = 'event_reminder_days';
  -- reminders to registered parents
  for e in select * from events where status = 'published' and date = current_date + lead
           and not exists (select 1 from push_campaigns where event_id = events.id and source = 'event_reminder')
  loop
    insert into push_campaigns (title, body, type, link_type, link_target, audience, scheduled_at, status, source, event_id)
      select e.title || ' πλησιάζει', 'Η εκδήλωσή σου ξεκινά σε ' || lead || ' ημέρες. Πάτα για λεπτομέρειες.', 'event', 'event', e.id::text,
             jsonb_build_object('user_ids', coalesce(jsonb_agg(distinct parent_id), '[]'::jsonb)), now(), 'scheduled', 'event_reminder', e.id
      from event_registrations where event_id = e.id having count(*) > 0;
    n := n + 1;
  end loop;
  -- announcements with age targeting
  for e in select * from events where status = 'published' and notify_on = current_date and notified_at is null
  loop
    insert into push_campaigns (title, body, type, link_type, link_target, audience, scheduled_at, status, source, event_id)
      values (e.title, left(e.description, 140), 'event', 'event', e.id::text,
              jsonb_strip_nulls(jsonb_build_object('all', true, 'kid_min_age', e.notify_min_age, 'kid_max_age', e.notify_max_age)),
              now(), 'scheduled', 'event_announce', e.id);
    update events set notified_at = now() where id = e.id;
    n := n + 1;
  end loop;
  return n;
end $$;

-- schedule (Cyprus morning ≈ 07:00 UTC)
select cron.schedule('expire-kids',        '0 3 * * *', $$select expire_kids()$$);
select cron.schedule('expire-points',      '30 3 * * *', $$select expire_points()$$);
select cron.schedule('birthday-pushes',    '0 7 * * *', $$select enqueue_birthday_pushes()$$);
select cron.schedule('event-pushes',       '5 7 * * *', $$select enqueue_event_pushes()$$);
