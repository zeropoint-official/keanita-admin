-- ============================================================
-- 0023 Close three public data leaks (launch audit 2026-11-05, A5).
--
-- 1. points_balances view ran with its owner's rights, so it ignored the RLS
--    on points_ledger: anyone with the public anon key could list every
--    account's id + balance (2,025 rows at the time).
-- 2. game_best_runs() / game_display_name() were callable by anyone: together
--    they returned every player's account id + kid id and the kid's first name
--    and last initial. They are only meant as helpers for game_leaderboard()
--    and game_my_rank() (SECURITY DEFINER, so they keep working).
-- 3. points_balance(p_user) returned any account's balance to anyone.
-- ============================================================

-- 1. The view now runs with the CALLER's rights → points_ledger RLS applies:
--    a parent sees only their own row, staff (is_staff()) see everyone.
alter view public.points_balances set (security_invoker = true);
revoke all on public.points_balances from anon;
revoke all on public.points_balances from authenticated;
grant select on public.points_balances to authenticated;

-- 2. Leaderboard helpers: internal only.
revoke execute on function public.game_best_runs(text, text) from public, anon, authenticated;
revoke execute on function public.game_display_name(uuid, uuid) from public, anon, authenticated;

-- 3. Balance: only your own (or staff). Background jobs — cron (expire_points)
--    and service-role calls carry no anon/authenticated JWT role and keep the
--    full answer.
create or replace function public.points_balance(p_user uuid) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::int
    from points_ledger
   where user_id = p_user
     and (
       coalesce(auth.role(), '') not in ('anon', 'authenticated')
       or p_user = auth.uid()
       or is_staff()
     );
$$;
revoke execute on function public.points_balance(uuid) from public, anon;
grant execute on function public.points_balance(uuid) to authenticated, service_role;
