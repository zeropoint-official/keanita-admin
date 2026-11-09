-- ============================================================
-- 0026 Log in with MOBILE + password (launch checklist A8).
--
-- The old app logged parents in by mobile number; the new one by email, and
-- many migrated parents don't remember which email they registered. Their old
-- passwords already work (bcrypt hashes migrated as-is), so:
--
--   app → rpc('login_email_for_mobile', {mobile, password})
--       → the account's email ONLY if the password is right (else null)
--   app → supabase.auth.signInWithPassword({ email, password })   (normal login)
--
-- Safety:
--   • Never reveals anything unless the password is correct.
--   • Rate limited per number: 5 wrong tries / 15 min and 20 / day, so it
--     can't be used to guess passwords around GoTrue's own limits.
--   • Unknown numbers burn the same bcrypt time as known ones, so response
--     time doesn't reveal which numbers are registered.
--   • Attempts live in a table with RLS on and no policies (API can't read it).
--
-- Also: emails_for_mobile() for the reset-by-mobile Edge Function
-- (service_role only), and a nightly cleanup of old attempts.
-- ============================================================

-- Digits only, last 8 → Cypriot number without +357/00357 prefix.
create or replace function public.normalize_mobile(p text) returns text
language sql immutable set search_path = public as $$
  select nullif(right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 8), '');
$$;

create index if not exists profiles_mobile8_idx on public.profiles (public.normalize_mobile(mobile));

create table public.auth_attempts (
  id           bigint generated always as identity primary key,
  mobile8      text not null,
  kind         text not null check (kind in ('login', 'reset')),
  success      boolean not null,
  attempted_at timestamptz not null default now()
);
create index auth_attempts_lookup_idx on public.auth_attempts (mobile8, kind, attempted_at desc);
alter table public.auth_attempts enable row level security;   -- no policies: invisible to the API

-- ── login ────────────────────────────────────────────────────
create or replace function public.login_email_for_mobile(p_mobile text, p_password text)
returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  m        text := normalize_mobile(p_mobile);
  recent   int;
  daily    int;
  found    boolean := false;
  r        record;
  -- bcrypt of a random string: lets unknown numbers take the same time as known ones
  dummy    constant text := '$2a$10$agZcADYce3TL52AP8/Q5vOc4eG/dvliynDptzlRU0MCWfFlbKbugS';
begin
  if m is null or length(m) <> 8 or coalesce(p_password, '') = '' then
    return null;
  end if;

  select count(*) filter (where attempted_at > now() - interval '15 minutes'),
         count(*)
    into recent, daily
    from auth_attempts
   where mobile8 = m and kind = 'login' and not success
     and attempted_at > now() - interval '24 hours';
  if recent >= 5 or daily >= 20 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;

  for r in
    select u.email, u.encrypted_password
      from profiles p
      join auth.users u on u.id = p.id
     where normalize_mobile(p.mobile) = m
       and u.email is not null
       and u.encrypted_password like '$2%'
       and u.deleted_at is null
       and (u.banned_until is null or u.banned_until < now())
     order by u.last_sign_in_at desc nulls last, u.created_at desc
     limit 3
  loop
    found := true;
    if crypt(p_password, r.encrypted_password) = r.encrypted_password then
      insert into auth_attempts (mobile8, kind, success) values (m, 'login', true);
      return r.email;
    end if;
  end loop;

  if not found then
    perform crypt(p_password, dummy);
  end if;
  insert into auth_attempts (mobile8, kind, success) values (m, 'login', false);
  return null;
end $$;

revoke execute on function public.login_email_for_mobile(text, text) from public;
grant execute on function public.login_email_for_mobile(text, text) to anon, authenticated;

-- ── reset password by mobile (called only by the Edge Function) ──
-- Returns the account emails for a number, and logs the request; at most
-- 3 reset requests per number per hour.
create or replace function public.emails_for_mobile(p_mobile text)
returns setof text
language plpgsql security definer set search_path = public as $$
declare
  m text := normalize_mobile(p_mobile);
  n int;
begin
  if m is null or length(m) <> 8 then return; end if;
  select count(*) into n from auth_attempts
   where mobile8 = m and kind = 'reset' and attempted_at > now() - interval '1 hour';
  if n >= 3 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;
  insert into auth_attempts (mobile8, kind, success) values (m, 'reset', true);
  return query
    select u.email::text
      from profiles p
      join auth.users u on u.id = p.id
     where normalize_mobile(p.mobile) = m
       and u.email is not null
       and u.deleted_at is null
     order by u.last_sign_in_at desc nulls last, u.created_at desc
     limit 3;
end $$;

revoke execute on function public.emails_for_mobile(text) from public, anon, authenticated;
grant execute on function public.emails_for_mobile(text) to service_role;

-- ── housekeeping ─────────────────────────────────────────────
select cron.schedule('purge-auth-attempts', '15 4 * * *',
  $$delete from public.auth_attempts where attempted_at < now() - interval '7 days'$$);
