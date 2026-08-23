-- ============================================================
-- 0002 CONTENT: events, products, stores, activities, characters, sliders, settings, pages
-- ============================================================
create type event_type    as enum ('event','seminar','announcement');
create type product_category as enum ('juice','yogurt');
create type activity_kind as enum ('puzzle','download');

-- ---------- events & seminars ----------
create table events (
  id                uuid primary key default gen_random_uuid(),
  type              event_type not null default 'event',
  title             text not null,
  description       text not null default '',
  date              date not null,
  time_label        text,                 -- free text e.g. '11:00 - 13:00' / 'Όλη μέρα'
  starts_at         timestamptz,
  location          text,
  image_url         text,
  accent_color      text not null default '#E84D3D',
  bg_color          text not null default '#FFF0EE',
  highlights        jsonb not null default '[]',   -- [{emoji,label}]
  rsvp_points       integer not null default 10,
  capacity          integer,
  show_on_home      boolean not null default true,
  show_call_button  boolean not null default false,
  allow_registration boolean not null default true,
  -- push targeting (from old admin)
  notify_on         date,
  notify_min_age    smallint,
  notify_max_age    smallint,
  notified_at       timestamptz,
  status            content_status not null default 'draft',
  sort_order        integer not null default 0,
  old_import_id     integer,
  created_by        uuid references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index events_date_idx on events(date);
create index events_status_idx on events(status);
create trigger events_updated before update on events for each row execute function set_updated_at();

create table event_registrations (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events(id) on delete cascade,
  parent_id     uuid not null references profiles(id) on delete cascade,
  kid_id        uuid references kids(id) on delete set null,
  checked_in_at timestamptz,
  created_at    timestamptz not null default now(),
  unique (event_id, parent_id, kid_id)
);
create index event_registrations_event_idx on event_registrations(event_id);

-- ---------- products ----------
create table products (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category      product_category not null default 'juice',
  tagline       text,
  description   text,
  image_url     text,
  accent_color  text not null default '#F5A623',
  bg_color      text not null default '#FFF6E8',
  serving_size  text default 'ανά 100ml',
  highlights    text[] not null default '{}',
  ingredients   text[] not null default '{}',
  nutrition     jsonb not null default '[]',   -- [{label,value}]
  status        content_status not null default 'published',
  sort_order    integer not null default 0,
  old_import_id integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger products_updated before update on products for each row execute function set_updated_at();

-- ---------- partner stores & discounts ----------
create table store_categories (
  id          serial primary key,
  name        text not null,
  sort_order  integer not null default 0,
  old_import_id integer
);
create table stores (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  category_id   integer references store_categories(id) on delete set null,
  phone         text,
  website       text,
  description   text,
  logo_url      text,
  address       text,
  city          text,
  status        content_status not null default 'published',
  sort_order    integer not null default 0,
  old_import_id integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger stores_updated before update on stores for each row execute function set_updated_at();
create table store_discounts (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  value       numeric(5,2) not null,     -- percent
  description text not null default 'Έκπτωση',
  sort_order  integer not null default 0
);
create index store_discounts_store_idx on store_discounts(store_id);

-- ---------- activities (puzzles + downloadable PDFs) ----------
create table activities (
  id            uuid primary key default gen_random_uuid(),
  kind          activity_kind not null,
  title         text not null,
  category      text,                     -- 'Δραστηριότητες' / 'Κατασκευές DIY' / ...
  image_url     text,
  file_url      text not null,            -- PDF
  status        content_status not null default 'published',
  sort_order    integer not null default 0,
  old_import_id integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger activities_updated before update on activities for each row execute function set_updated_at();

-- ---------- characters ----------
create table characters (
  id              serial primary key,
  slug            text unique not null,
  name            text not null,
  tagline         text,
  description     text,
  best_friend     text,
  power           text,
  favorite_juice  text,
  image_url       text,
  accent_color    text not null default '#1E9A3D',
  bg_color        text not null default '#DCF5DC',
  sort_order      integer not null default 0,
  status          content_status not null default 'published',
  updated_at      timestamptz not null default now()
);
create trigger characters_updated before update on characters for each row execute function set_updated_at();
alter table kids add constraint kids_fav_character_fk foreign key (favorite_character_id) references characters(id) on delete set null;

-- ---------- home hero sliders ----------
create table home_sliders (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  subtitle      text,
  image_url     text,
  accent_color  text not null default '#E84D3D',
  bg_color      text not null default '#FFF0EE',
  link_type     text check (link_type in ('event','product','screen','url')),
  link_target   text,                      -- event uuid / product uuid / '/gifts' / https://…
  starts_at     timestamptz,
  ends_at       timestamptz,
  status        content_status not null default 'published',
  sort_order    integer not null default 0,
  updated_at    timestamptz not null default now()
);
create trigger home_sliders_updated before update on home_sliders for each row execute function set_updated_at();

-- ---------- app settings (key/value) & pages ----------
create table app_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now()
);
create trigger app_settings_updated before update on app_settings for each row execute function set_updated_at();

create table pages (
  slug        text primary key,            -- 'terms', 'about', 'privacy'
  title       text not null,
  body_md     text not null default '',
  updated_at  timestamptz not null default now()
);
create trigger pages_updated before update on pages for each row execute function set_updated_at();
