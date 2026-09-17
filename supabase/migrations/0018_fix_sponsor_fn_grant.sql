-- ============================================================
-- 0018 FIX: current_sponsor_id() is referenced by RLS policies on
-- sponsors/sponsor_campaigns, and policies are evaluated for EVERY
-- role — 0017's revoke from anon broke all signed-out reads of those
-- tables ("permission denied for function current_sponsor_id").
-- It returns null for non-sponsors, so granting anon is harmless.
-- ============================================================

grant execute on function current_sponsor_id() to anon;
