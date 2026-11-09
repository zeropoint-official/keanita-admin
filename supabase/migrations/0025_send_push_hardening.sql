-- ============================================================
-- 0025 invoke_send_push: pin search_path (SECURITY DEFINER hardening) and make
-- sure only the cron job (postgres) can run it — never anon/authenticated.
-- ============================================================
alter function public.invoke_send_push() set search_path = public;
revoke execute on function public.invoke_send_push() from public, anon, authenticated;
