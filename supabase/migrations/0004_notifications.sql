-- ============================================================
-- 0004 NOTIFICATIONS: device tokens, campaigns, inbox, contact messages
-- ============================================================
create type notification_type as enum ('event','reward','gift','system','birthday');
create type campaign_status   as enum ('draft','scheduled','sending','sent','failed','cancelled');

create table device_tokens (
  token       text primary key,            -- Expo push token
  user_id     uuid not null references profiles(id) on delete cascade,
  platform    text check (platform in ('ios','android','web')),
  last_seen_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index device_tokens_user_idx on device_tokens(user_id);

-- a push send (manual or automated). audience is a JSON filter.
create table push_campaigns (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  body          text not null,
  type          notification_type not null default 'system',
  link_type     text check (link_type in ('event','product','screen','url')),
  link_target   text,
  -- {"all":true} | {"districts":[..],"kid_min_age":5,"kid_max_age":9,"kid_status":"approved","user_ids":[..]}
  audience      jsonb not null default '{"all":true}',
  scheduled_at  timestamptz,
  status        campaign_status not null default 'draft',
  source        text not null default 'manual',   -- manual | birthday | event_reminder | event_announce
  event_id      uuid references events(id) on delete set null,
  stats         jsonb not null default '{}',      -- {targeted,sent,delivered,opened,failed}
  created_by    uuid references auth.users(id),
  sent_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index push_campaigns_status_idx on push_campaigns(status, scheduled_at);
create trigger push_campaigns_updated before update on push_campaigns for each row execute function set_updated_at();

-- per-user inbox (what the app's /notifications screen shows)
create table notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  kid_id        uuid references kids(id) on delete set null,
  campaign_id   uuid references push_campaigns(id) on delete set null,
  title         text not null,
  body          text not null,
  type          notification_type not null default 'system',
  link_type     text,
  link_target   text,
  read_at       timestamptz,
  clicked_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, created_at desc);

create table contact_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references profiles(id) on delete set null,
  name        text not null,
  email       text not null,
  subject     text,
  message     text not null,
  status      text not null default 'new' check (status in ('new','read','replied','archived')),
  created_at  timestamptz not null default now()
);
