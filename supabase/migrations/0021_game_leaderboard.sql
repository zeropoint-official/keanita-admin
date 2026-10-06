-- ============================================================
-- 0021 GAME LEADERBOARD: Φρουτοτρέλα rankings.
-- game_scores is locked to "own rows only" (0005 scores_own), so a
-- leaderboard needs security-definer functions. The two that can see
-- user ids stay ungranted — only the app-facing pair is callable, and
-- those return nothing but a first name + a score.
-- One row per family (their best run), so a kid who plays 40 times
-- can't fill the whole board.
-- ============================================================

-- Serves the board scan: filter by game + date, then the per-user best.
create index if not exists game_scores_board_idx
  on game_scores(game, user_id, score desc, created_at);

-- Period -> cutoff. Weeks/months are Nicosia-local so "this week" means
-- what a parent in Cyprus thinks it means, not UTC.
-- STABLE, not IMMUTABLE: it reads now(), so constant-folding it into a
-- cached plan would freeze the cutoff at whenever the plan was built.
create or replace function game_period_start(p_period text)
returns timestamptz language sql stable as $$
  select case p_period
    when 'week'  then date_trunc('week',  (now() at time zone 'Asia/Nicosia')) at time zone 'Asia/Nicosia'
    when 'month' then date_trunc('month', (now() at time zone 'Asia/Nicosia')) at time zone 'Asia/Nicosia'
    else '-infinity'::timestamptz
  end;
$$;

-- Best run per family in the period. Ties break on who got there first.
-- INTERNAL — exposes user ids, never granted to authenticated.
create or replace function game_best_runs(p_game text, p_period text)
returns table (user_id uuid, kid_id uuid, score integer, achieved_at timestamptz)
language sql stable security definer set search_path = public as $$
  select distinct on (s.user_id)
         s.user_id, s.kid_id, s.score, s.created_at
    from game_scores s
   where s.game = p_game
     and s.created_at >= game_period_start(p_period)
   order by s.user_id, s.score desc, s.created_at asc;
$$;

-- "Μαρία Κ." — first name of the kid who played (falling back to the
-- parent), plus one initial so two Μαρίες are tellable apart.
-- INTERNAL — called only by game_leaderboard.
create or replace function game_display_name(p_user uuid, p_kid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
           nullif(trim(
             coalesce(k.first_name, pr.firstname, '') ||
             case when coalesce(k.last_name, pr.lastname, '') <> ''
                  then ' ' || upper(left(coalesce(k.last_name, pr.lastname), 1)) || '.'
                  else '' end
           ), ''),
           'Παίκτης')
    from profiles pr
    -- left join: a since-deleted kid must not drop the row
    left join kids k on k.id = p_kid
   where pr.id = p_user;
$$;

-- ---------- the board ----------
create or replace function game_leaderboard(
  p_game text default 'fruit_frenzy',
  p_period text default 'all',
  p_limit integer default 50
) returns table (rank integer, display_name text, score integer, is_me boolean)
language sql stable security definer set search_path = public as $$
  select (row_number() over (order by b.score desc, b.achieved_at asc))::integer,
         game_display_name(b.user_id, b.kid_id),
         b.score,
         b.user_id = auth.uid()
    from game_best_runs(p_game, p_period) b
   order by b.score desc, b.achieved_at asc
   limit least(greatest(p_limit, 1), 100);
$$;

-- The caller's own standing, so players outside the top N still see
-- where they sit instead of nothing at all.
create or replace function game_my_rank(
  p_game text default 'fruit_frenzy',
  p_period text default 'all'
) returns table (rank integer, score integer, total integer)
language sql stable security definer set search_path = public as $$
  with ranked as (
    select b.user_id,
           b.score,
           (row_number() over (order by b.score desc, b.achieved_at asc))::integer as rank
      from game_best_runs(p_game, p_period) b
  )
  select r.rank, r.score, (select count(*)::integer from ranked)
    from ranked r
   where r.user_id = auth.uid();
$$;

-- Only the two app-facing functions are callable. game_best_runs and
-- game_display_name run with the definer's rights from inside them.
revoke execute on function game_best_runs(text, text) from public;
revoke execute on function game_display_name(uuid, uuid) from public;
grant execute on function game_period_start(text) to authenticated;
grant execute on function game_leaderboard(text, text, integer) to authenticated;
grant execute on function game_my_rank(text, text) to authenticated;
