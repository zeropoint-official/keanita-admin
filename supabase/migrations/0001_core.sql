-- ============================================================
-- 0001 CORE: extensions, enums, profiles, kids, staff
-- ============================================================
create extension if not exists "pgcrypto";
create extension if not exists "pg_cron";

create type kid_status      as enum ('pending','approved','rejected','expired');
create type gender          as enum ('boy','girl','other');
create type staff_role      as enum ('admin','editor','viewer');
create type content_status  as enum ('draft','published','archived');

-- helper: updated_at trigger
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- profiles (parents) — ALREADY EXISTS (created by nextjs-sample/migration/profiles_schema.sql,
-- holds ~7,961 imported accounts: id, legacy_id, firstname, lastname, mobile, dob, created_at). Extend it. ----------
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  legacy_id   bigint unique,
  firstname   text,
  lastname    text,
  mobile      text,
  dob         date,
  created_at  timestamptz default now()
);
alter table profiles
  add column if not exists email        text,
  add column if not exists district     text,
  add column if not exists area         text,
  add column if not exists city         text,
  add column if not exists language     text not null default 'el',
  add column if not exists avatar_url   text,
  add column if not exists is_active    boolean not null default true,
  add column if not exists last_seen_at timestamptz,
  add column if not exists updated_at   timestamptz not null default now();
create index if not exists profiles_mobile_idx on profiles(mobile);
-- backfill email from auth.users
update profiles p set email = u.email from auth.users u where u.id = p.id and p.email is null;
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();

-- auto-create profile on signup
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, firstname, lastname)
  values (new.id, new.email, new.raw_user_meta_data->>'firstname', new.raw_user_meta_data->>'lastname')
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ---------- kids ----------
create table kids (
  id              uuid primary key default gen_random_uuid(),
  parent_id       uuid not null references profiles(id) on delete cascade,
  first_name      text not null,
  last_name       text,
  dob             date not null,
  gender          gender,
  status          kid_status not null default 'pending',
  member_id       text unique,         -- printed on the membership card
  reject_reason   text,
  favorite_character_id integer,
  avatar_url      text,
  approved_at     timestamptz,
  expired_at      timestamptz,
  old_import_id   integer,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index kids_parent_idx on kids(parent_id);
create index kids_status_idx on kids(status);
create index kids_dob_idx on kids(dob);
create trigger kids_updated before update on kids for each row execute function set_updated_at();

-- member id generator: KC-000123
create sequence kid_member_seq start 1000;
create or replace function assign_member_id() returns trigger language plpgsql as $$
begin
  if new.status = 'approved' and new.member_id is null then
    new.member_id := 'KC-' || lpad(nextval('kid_member_seq')::text, 6, '0');
    new.approved_at := coalesce(new.approved_at, now());
  end if;
  return new;
end $$;
create trigger kids_member_id before insert or update on kids for each row execute function assign_member_id();

-- ---------- staff (dashboard users) ----------
create table staff (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        staff_role not null default 'viewer',
  created_at  timestamptz not null default now()
);

-- helper used by RLS everywhere
create or replace function is_staff(min_role staff_role default 'viewer') returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff s
    where s.id = auth.uid()
      and (case s.role when 'admin' then 2 when 'editor' then 1 else 0 end)
          >= (case min_role when 'admin' then 2 when 'editor' then 1 else 0 end)
  );
$$;

-- ---------- audit log ----------
create table audit_log (
  id          bigserial primary key,
  actor_id    uuid references auth.users(id),
  action      text not null,          -- e.g. 'kid.approve', 'points.adjust'
  entity      text not null,          -- table name
  entity_id   text,
  payload     jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_entity_idx on audit_log(entity, entity_id);
