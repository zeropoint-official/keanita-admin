-- ============================================================
-- 0003 REWARDS: rules, points ledger, gifts, redemptions, QR codes
-- ============================================================
create type gift_category     as enum ('digital','physical');
create type redemption_status as enum ('requested','approved','shipped','delivered','rejected','cancelled');
create type points_reason     as enum ('daily_login','streak_bonus','game','event_rsvp','profile_complete','qr_scan','gift_redeem','refund','manual','birthday','expiry');

-- editable point values per action
create table reward_rules (
  key           points_reason primary key,
  label         text not null,
  points        integer not null,
  daily_cap     integer,                 -- max points/day from this action (null = none)
  is_active     boolean not null default true,
  config        jsonb not null default '{}',   -- e.g. streak tiers {"3":10,"7":30}
  updated_at    timestamptz not null default now()
);
create trigger reward_rules_updated before update on reward_rules for each row execute function set_updated_at();

-- append-only ledger; balance = sum(amount)
create table points_ledger (
  id            bigserial primary key,
  user_id       uuid not null references profiles(id) on delete cascade,
  kid_id        uuid references kids(id) on delete set null,
  amount        integer not null,         -- + earned / - spent
  reason        points_reason not null,
  label         text not null,
  ref_id        text,                     -- event id, redemption id, qr code …
  expires_at    timestamptz,              -- earned points expire (12 months default)
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);
create index points_ledger_user_idx on points_ledger(user_id, created_at desc);

create view points_balances as
  select user_id, coalesce(sum(amount),0)::int as balance,
         coalesce(sum(amount) filter (where amount > 0),0)::int as lifetime_earned
  from points_ledger group by user_id;

create or replace function points_balance(p_user uuid) returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount),0)::int from points_ledger where user_id = p_user;
$$;

-- ---------- gifts catalog ----------
create table gifts (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  description       text,
  cost              integer not null,
  category          gift_category not null default 'digital',
  emoji             text,
  image_url         text,
  color             text not null default '#E84D3D',
  bg_color          text not null default '#FFF0EE',
  stock             integer,                 -- null = unlimited
  requires_approval boolean not null default false,
  status            content_status not null default 'published',
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create trigger gifts_updated before update on gifts for each row execute function set_updated_at();

create table redemptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  kid_id        uuid references kids(id) on delete set null,
  gift_id       uuid not null references gifts(id),
  cost          integer not null,          -- snapshot
  status        redemption_status not null default 'requested',
  note          text,                      -- staff note / rejection reason
  ledger_id     bigint references points_ledger(id),
  handled_by    uuid references auth.users(id),
  handled_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index redemptions_status_idx on redemptions(status, created_at desc);
create index redemptions_user_idx on redemptions(user_id);

-- ---------- QR codes on packaging ----------
create table qr_codes (
  code          text primary key,          -- random, printed on pack
  batch         text not null,
  product_id    uuid references products(id) on delete set null,
  points        integer not null default 20,
  max_uses      integer not null default 1,
  uses          integer not null default 0,
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);
create index qr_codes_batch_idx on qr_codes(batch);

create table qr_scans (
  id          bigserial primary key,
  code        text not null references qr_codes(code),
  user_id     uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (code, user_id)
);

-- ---------- game scores ----------
create table game_scores (
  id          bigserial primary key,
  user_id     uuid not null references profiles(id) on delete cascade,
  kid_id      uuid references kids(id) on delete set null,
  game        text not null default 'fruit_frenzy',
  score       integer not null,
  points      integer not null default 0,
  created_at  timestamptz not null default now()
);
create index game_scores_user_idx on game_scores(user_id, created_at desc);
