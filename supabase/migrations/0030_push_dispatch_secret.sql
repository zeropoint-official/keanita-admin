-- ============================================================
-- 0030 Push dispatcher authenticates with its own shared secret.
--
-- Pushes never reached a phone: invoke_send_push() looked for a vault
-- secret `service_role_key` that was never stored, so every run returned
-- early while pg_cron reported success. Storing it would not have helped
-- either: the project now uses the new (non-JWT) API keys, so the key the
-- Edge Function sees no longer matches the legacy JWT.
--
-- Now: a random secret lives in BOTH the vault (`push_dispatch_secret`)
-- and the send-push function secrets (PUSH_DISPATCH_SECRET). The function
-- is deployed with verify_jwt = false and accepts only that header. This
-- keeps working when the legacy keys are switched off.
--
-- A missing secret now RAISES (cron shows the run as failed) instead of
-- a warning nobody sees.
-- ============================================================
create or replace function public.invoke_send_push()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare secret text;
begin
  if not exists (select 1 from push_campaigns where status = 'scheduled' and scheduled_at <= now()) then
    return;
  end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_dispatch_secret' limit 1;
  if secret is null then
    raise exception 'send-push: vault secret push_dispatch_secret is missing — campaigns are not being sent';
  end if;
  perform net.http_post(
    url := 'https://jwxbhcmytgytbhhamace.functions.supabase.co/send-push',
    headers := jsonb_build_object('x-dispatch-secret', secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000);
end $$;

revoke execute on function public.invoke_send_push() from public, anon, authenticated;
