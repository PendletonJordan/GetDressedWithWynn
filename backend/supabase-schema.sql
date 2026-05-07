-- ─────────────────────────────────────────────────────────────
-- Morning Outfit Agent — Supabase Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────

-- Profiles (one per child)
create table if not exists profiles (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  age             integer,
  school          text not null,
  city            text not null,
  favorite_colors text[]   default '{}',
  alexa_enabled   boolean  default true,
  wake_time       text     default '7:00 AM',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Events (spirit days, sports, other)
create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references profiles(id) on delete cascade,
  date        date not null,
  type        text not null check (type in ('spirit', 'sports', 'other')),
  label       text not null,
  detail      text default '',
  created_at  timestamptz default now()
);

create index if not exists events_profile_date on events(profile_id, date);

-- Recommendations (one per profile per day, upserted on regenerate)
create table if not exists recommendations (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references profiles(id) on delete cascade,
  date          date not null,
  data          jsonb not null,   -- the full Claude recommendation object
  weather       jsonb,            -- weather snapshot at generation time
  generated_at  timestamptz default now(),
  unique(profile_id, date)        -- enforces one rec per child per day
);

create index if not exists recs_profile_date on recommendations(profile_id, date);

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- The backend uses the service key which bypasses RLS.
-- Enable RLS anyway as a good habit — adjust if you add user auth later.
-- ─────────────────────────────────────────────────────────────

alter table profiles       enable row level security;
alter table events         enable row level security;
alter table recommendations enable row level security;
