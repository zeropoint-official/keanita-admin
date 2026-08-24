-- ============================================================
-- 0008: invoke the send-push Edge Function every minute for due campaigns.
-- Requires: function deployed (`supabase functions deploy send-push`) and
-- the service role key stored once:
--   select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
-- ============================================================
create extension if not exists pg_net;

create or replace function invoke_send_push() returns void language plpgsql security definer as $$
declare key text;
begin
  if not exists (select 1 from push_campaigns where status = 'scheduled' and scheduled_at <= now()) then return; end if;
  select decrypted_secret into key from vault.decrypted_secrets where name = 'service_role_key' limit 1;
  if key is null then raise warning 'send-push: no service_role_key secret in vault'; return; end if;
  perform net.http_post(
    url := 'https://jwxbhcmytgytbhhamace.functions.supabase.co/send-push',
    headers := jsonb_build_object('Authorization', 'Bearer ' || key, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000);
end $$;

select cron.schedule('send-push-dispatch', '* * * * *', $$select invoke_send_push()$$);
