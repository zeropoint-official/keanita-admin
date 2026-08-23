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

-- ---------- profiles (parents) — 1:1 with auth.users ----------
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  first_name      text,
  last_name       text,
  mobile          text unique,
  email           text,
  district        text,
  area            text,
  city            text,
  language        text not null default 'el',
  avatar_url      text,
  is_active       boolean not null default true,
  old_import_id   integer,            -- id in the old MySQL `users` table
  last_seen_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger profiles_updated before update on profiles for each row execute function set_updated_at();

-- auto-create profile on signup
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, first_name, last_name)
  values (new.id, new.email, new.raw_user_meta_data->>'firstname', new.raw_user_meta_data->>'lastname')
  on conflict (id) do nothing;
  return new;
end $$;
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
