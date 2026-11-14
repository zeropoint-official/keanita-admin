-- ============================================================
-- 0027 Contact-form messages are kept for at most 12 months
-- (privacy policy §6, approved 2026-11-14). Nightly purge.
-- ============================================================
select cron.schedule('purge-contact-messages', '25 4 * * *',
  $$delete from public.contact_messages where created_at < now() - interval '12 months'$$);
