-- 0020: in-app analytics.
-- Raw events land in app_events (60-day retention), a nightly cron rolls them up
-- into app_events_daily (kept forever, tiny), and two invoker RPCs serve the
-- dashboard aggregates so it never pages raw rows through PostgREST.

-- ---------- raw events ----------
create table app_events (
  id          bigserial primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 64),
  props       jsonb check (props is null or octet_length(props::text) <= 2048),
  created_at  timestamptz not null default now()
);
create index app_events_created_idx on app_events (created_at);
create index app_events_name_idx on app_events (name, created_at);

alter table app_events enable row level security;
create policy "app_events_insert_own" on app_events for insert to authenticated
  with check (user_id = auth.uid());
create policy "app_events_staff_read" on app_events for select to authenticated
  using (is_staff());

-- ---------- daily rollup (permanent history) ----------
create table app_events_daily (
  day    date not null,
  name   text not null,
  count  integer not null,
  users  integer not null,
  primary key (day, name)
);
alter table app_events_daily enable row level security;
create policy "app_events_daily_staff_read" on app_events_daily for select to authenticated
  using (is_staff());

-- Recompute complete days that are still fully inside raw retention (idempotent
-- overwrite), then prune raw events past 60 days. Days older than the recompute
-- window keep their frozen rollups.
create or replace function rollup_app_events() returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into app_events_daily (day, name, count, users)
  select (created_at at time zone 'Asia/Nicosia')::date, name, count(*), count(distinct user_id)
  from app_events
  where created_at >= now() - interval '50 days'
    and (created_at at time zone 'Asia/Nicosia')::date < (now() at time zone 'Asia/Nicosia')::date
  group by 1, 2
  on conflict (day, name) do update set count = excluded.count, users = excluded.users;

  delete from app_events where created_at < now() - interval '60 days';
end $$;
revoke execute on function rollup_app_events() from public, anon, authenticated;

select cron.schedule('rollup-app-events', '40 2 * * *', $$select rollup_app_events()$$);

-- ---------- dashboard aggregates ----------
-- Both run as invoker: RLS on the underlying tables limits non-staff callers to
-- their own rows, staff see everything.

-- Per-day activity series. Active = distinct users with a daily_login ledger row
-- (the app writes exactly one per user per day on open).
create or replace function analytics_activity(p_days integer default 30)
returns table(day date, active_users integer, game_plays integer, avg_score numeric,
              kp_earned bigint, kp_spent bigint, signups integer)
language sql stable set search_path = public as $$
  with bounds as (
    select (now() at time zone 'Asia/Nicosia')::date - (least(greatest(p_days, 1), 365) - 1) as first_day
  ),
  days as (
    select generate_series((select first_day from bounds), (now() at time zone 'Asia/Nicosia')::date, interval '1 day')::date as day
  ),
  ledger as (
    select (created_at at time zone 'Asia/Nicosia')::date as day,
           count(distinct user_id) filter (where reason = 'daily_login') as active_users,
           coalesce(sum(amount) filter (where amount > 0), 0) as kp_earned,
           coalesce(-sum(amount) filter (where amount < 0), 0) as kp_spent
    from points_ledger
    where created_at >= (select first_day from bounds)::timestamp at time zone 'Asia/Nicosia'
    group by 1
  ),
  games as (
    select (created_at at time zone 'Asia/Nicosia')::date as day,
           count(*) as game_plays, round(avg(score), 1) as avg_score
    from game_scores
    where created_at >= (select first_day from bounds)::timestamp at time zone 'Asia/Nicosia'
    group by 1
  ),
  joins as (
    select (created_at at time zone 'Asia/Nicosia')::date as day, count(*) as signups
    from profiles
    where created_at >= (select first_day from bounds)::timestamp at time zone 'Asia/Nicosia'
    group by 1
  )
  select d.day,
         coalesce(l.active_users, 0)::integer,
         coalesce(g.game_plays, 0)::integer,
         g.avg_score,
         coalesce(l.kp_earned, 0)::bigint,
         coalesce(l.kp_spent, 0)::bigint,
         coalesce(j.signups, 0)::integer
  from days d
  left join ledger l using (day)
  left join games g using (day)
  left join joins j using (day)
  order by d.day
$$;

-- Per-day, per-event counts: frozen rollups plus today's (and any not-yet-rolled)
-- raw events.
create or replace function analytics_events(p_days integer default 30)
returns table(day date, name text, count integer, users integer)
language sql stable set search_path = public as $$
  with bounds as (
    select (now() at time zone 'Asia/Nicosia')::date - (least(greatest(p_days, 1), 365) - 1) as first_day
  )
  select day, name, count, users from app_events_daily
  where day >= (select first_day from bounds)
  union all
  select (created_at at time zone 'Asia/Nicosia')::date as day, name,
         count(*)::integer, count(distinct user_id)::integer
  from app_events e
  where created_at >= (select first_day from bounds)::timestamp at time zone 'Asia/Nicosia'
    and not exists (select 1 from app_events_daily d
                    where d.day = (e.created_at at time zone 'Asia/Nicosia')::date and d.name = e.name)
  group by 1, 2
  order by day, name
$$;

-- Headline numbers. Distinct-user counts over windows can't be derived from the
-- per-day series (summing daily distincts double-counts), so they get their own
-- pass here.
create or replace function analytics_summary()
returns table(dau integer, wau integer, mau integer, total_members integer, new_members_30d integer)
language sql stable set search_path = public as $$
  with logins as (
    select user_id, (created_at at time zone 'Asia/Nicosia')::date as day
    from points_ledger
    where reason = 'daily_login' and created_at >= now() - interval '31 days'
  )
  select
    (select count(distinct user_id) from logins where day = (now() at time zone 'Asia/Nicosia')::date)::integer,
    (select count(distinct user_id) from logins where day > (now() at time zone 'Asia/Nicosia')::date - 7)::integer,
    (select count(distinct user_id) from logins where day > (now() at time zone 'Asia/Nicosia')::date - 30)::integer,
    (select count(*) from profiles)::integer,
    (select count(*) from profiles where created_at >= now() - interval '30 days')::integer
$$;

grant execute on function analytics_activity(integer) to authenticated;
grant execute on function analytics_events(integer) to authenticated;
grant execute on function analytics_summary() to authenticated;
