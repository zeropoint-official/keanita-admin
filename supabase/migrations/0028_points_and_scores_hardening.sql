-- ============================================================
-- 0028 Points & leaderboard hardening (launch audit 2026-11-19).
--
-- earn_points() trusted the client for two rules that have no daily cap:
--   • streak_bonus     — up to 100 KP per call, any number of calls
--   • profile_complete — 50 KP per call (the app never uses this rule)
-- so anyone with a session could mint KP by calling the RPC in a loop.
-- Now the server decides both:
--   • streak_bonus: the server counts the consecutive Cyprus-time days with a
--     daily_login up to today and pays the tier amount only when that count IS
--     a tier (config.tiers, e.g. 3 → 10, 7 → 30, 30 → 100 KP); at most once a
--     day (ref forced to 'streak:<date>'). The client's amount is ignored.
--   • profile_complete: once per account (ref forced), fixed amount.
-- Also: the advisory lock is taken BEFORE the daily-cap sum (two parallel
-- calls could both pass the cap), a kid id that isn't the caller's is dropped,
-- and the function returns 0 when a parallel call already wrote the row.
--
-- game_scores accepted any number and any kid id from the client:
--   • score must be 0–500 (a flawless 10-minute run at top speed is ~500;
--     the best real run so far is 57)
--   • a score row may only name one of the caller's own kids (the leaderboard
--     shows that kid's first name).
-- ============================================================

create or replace function public.earn_points(
  p_reason points_reason,
  p_label  text,
  p_amount integer default null,
  p_ref    text    default null,
  p_kid    uuid    default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r             reward_rules;
  amt           int;
  today_sum     int;
  expiry_months int;
  tier_max      int;
  max_single    int;
  streak        int;
  inserted      int;
  local_day     date := (now() at time zone 'Asia/Nicosia')::date;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_reason in ('manual', 'refund', 'expiry', 'gift_redeem', 'birthday', 'event_rsvp') then return 0; end if;

  select * into r from reward_rules where key = p_reason and is_active;
  if not found then return 0; end if;

  -- one caller at a time from here on (daily-cap sums and dedup checks)
  perform pg_advisory_xact_lock(hashtext('points:' || auth.uid()::text));

  -- a kid id is only kept if it is one of the caller's own kids
  if p_kid is not null and not exists (select 1 from kids where id = p_kid and parent_id = auth.uid()) then
    p_kid := null;
  end if;

  if p_reason = 'daily_login' then
    -- the daily-login dedup key is server truth, not client clock
    p_ref := 'login:' || to_char(local_day, 'YYYY-MM-DD');
    amt := r.points;

  elsif p_reason = 'streak_bonus' then
    -- consecutive Cyprus-time days with a daily_login, ending today
    select count(*) into streak
      from (select d, row_number() over (order by d desc) as rn
              from (select distinct (created_at at time zone 'Asia/Nicosia')::date as d
                      from points_ledger
                     where user_id = auth.uid() and reason = 'daily_login'
                       and created_at > now() - interval '400 days') days
             where d <= local_day) t
     where local_day - d = rn - 1;
    amt := (r.config -> 'tiers' ->> streak::text)::int;
    if amt is null or amt <= 0 then return 0; end if;
    p_ref := 'streak:' || to_char(local_day, 'YYYY-MM-DD');

  elsif p_reason = 'profile_complete' then
    amt := r.points;
    p_ref := 'profile_complete';

  else
    select coalesce(max(v::int), 0) into tier_max
      from jsonb_each_text(coalesce(r.config -> 'tiers', '{}'::jsonb)) as t(k, v);
    max_single := coalesce(r.daily_cap, greatest(r.points, tier_max));
    amt := least(coalesce(p_amount, r.points), max_single);
  end if;

  if r.daily_cap is not null then
    select coalesce(sum(amount), 0) into today_sum from points_ledger
     where user_id = auth.uid() and reason = p_reason
       and (created_at at time zone 'Asia/Nicosia')::date = local_day;
    amt := least(amt, greatest(r.daily_cap - today_sum, 0));
  end if;
  if amt is null or amt <= 0 then return 0; end if;

  if p_ref is not null and exists (
    select 1 from points_ledger where user_id = auth.uid() and reason = p_reason and ref_id = p_ref
  ) then
    return 0;
  end if;

  select coalesce((value ->> 0)::int, 12) into expiry_months from app_settings where key = 'points_expiry_months';
  insert into points_ledger (user_id, kid_id, amount, reason, label, ref_id, expires_at)
    values (auth.uid(), p_kid, amt, p_reason, p_label, p_ref,
            now() + make_interval(months => coalesce(expiry_months, 12)))
    on conflict do nothing
    returning amount into inserted;
  return coalesce(inserted, 0);
end $$;

-- ── leaderboard sanity ──────────────────────────────────────
alter table public.game_scores
  add constraint game_scores_score_range check (score between 0 and 500);

drop policy if exists "scores_insert" on public.game_scores;
create policy "scores_insert" on public.game_scores for insert
  with check (
    user_id = auth.uid()
    and (kid_id is null or exists (select 1 from public.kids k where k.id = kid_id and k.parent_id = auth.uid()))
  );
