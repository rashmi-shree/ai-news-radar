-- =============================================================================
-- AI News Radar — Initial Schema Migration
-- Run once in the Supabase SQL Editor (or via Supabase CLI).
-- All tables use uuid_generate_v4() which is available by default in Supabase.
-- =============================================================================

-- Enable UUID generation (already enabled on Supabase, here for completeness)
create extension if not exists "uuid-ossp";

-- =============================================================================
-- 1. articles
-- Core content store. Upserted on `link` by the ingestion pipeline.
-- =============================================================================
create table if not exists articles (
  id                uuid primary key default uuid_generate_v4(),
  title             text        not null,
  summary           text        not null default '',
  ai_summary        text        not null default '',
  why_it_matters    text        not null default '',
  risk_level        text,           -- 'high' | 'medium' | 'low'
  category          text        not null default 'General',
  source            text        not null default '',
  link              text        not null unique,
  published_at      timestamptz not null default now(),
  signal            text        not null default 'General',
  humor             text,
  read_time         text,
  relevance_score   int         not null default 0,
  -- Threat scoring columns (Phase 6)
  threat_score      int         not null default 0,
  signal_score      int         not null default 0,
  freshness_score   int         not null default 0,
  interest_score    int         not null default 0,
  risk_score        int         not null default 0,
  -- Timestamps
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  last_ingested_at  timestamptz
);

-- Index for fast threat-score ordering (feed ranking)
create index if not exists articles_threat_score_idx on articles (threat_score desc);
-- Index for category filtering
create index if not exists articles_category_idx on articles (category);
-- Index for published ordering
create index if not exists articles_published_at_idx on articles (published_at desc);

-- Enable realtime for this table (required for live feed updates)
alter table articles replica identity full;

-- =============================================================================
-- 2. saved_articles
-- Analyst workspace: one row per (user_id, article_id) at any given time.
-- The application enforces this via delete-then-insert; no DB unique constraint
-- is used because legacy duplicates are cleaned up at read time.
-- =============================================================================
create table if not exists saved_articles (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     text        not null,
  article_id  uuid        not null references articles(id) on delete cascade,
  action      text        not null,   -- mirrors status
  status      text        not null,   -- 'saved' | 'investigating' | 'reviewed' | 'ignored'
  notes       text,                   -- analyst investigation notes
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists saved_articles_user_article_idx
  on saved_articles (user_id, article_id, updated_at desc);

-- Enable realtime (workspace page subscribes to this table)
alter table saved_articles replica identity full;

-- =============================================================================
-- 3. threat_actions
-- Append-only audit log of every analyst action (separate from saved_articles).
-- =============================================================================
create table if not exists threat_actions (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     text        not null,
  article_id  uuid        not null references articles(id) on delete cascade,
  action      text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists threat_actions_user_idx on threat_actions (user_id, created_at desc);

-- =============================================================================
-- 4. user_interests
-- Topics selected by the user during onboarding or in settings.
-- =============================================================================
create table if not exists user_interests (
  id         uuid        primary key default uuid_generate_v4(),
  user_id    text        not null,
  topic      text        not null,
  created_at timestamptz not null default now(),
  unique (user_id, topic)
);

create index if not exists user_interests_user_idx on user_interests (user_id);

-- =============================================================================
-- 5. user_profiles
-- Extended profile set during onboarding.
-- =============================================================================
create table if not exists user_profiles (
  id              uuid        primary key default uuid_generate_v4(),
  user_id         text        not null unique,
  role            text,
  company         text,
  domain          text,
  tools           jsonb       not null default '[]',
  favorite_topics jsonb       not null default '[]',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- =============================================================================
-- 6. user_preferences
-- Per-user notification + feed settings from /settings/preferences.
-- =============================================================================
create table if not exists user_preferences (
  id                 uuid        primary key default uuid_generate_v4(),
  user_id            text        not null unique,
  topics             jsonb       not null default '[]',
  notify_critical    boolean     not null default true,
  notify_new_threats boolean     not null default true,
  notify_digest      boolean     not null default true,
  digest_frequency   text        not null default 'daily',   -- 'daily' | 'weekly' | 'off'
  realtime_enabled   boolean     not null default true,
  risk_threshold     text        not null default 'low',     -- 'high' | 'medium' | 'low'
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- =============================================================================
-- 7. user_behavior
-- Append-only event log used to compute interest affinity and feed boosts.
-- =============================================================================
create table if not exists user_behavior (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     text        not null,
  article_id  uuid        not null references articles(id) on delete cascade,
  event       text        not null,   -- 'view' | 'save' | 'investigating' | 'reviewed' | 'ignored' | 'removed'
  created_at  timestamptz not null default now()
);

create index if not exists user_behavior_user_idx on user_behavior (user_id, created_at desc);
create index if not exists user_behavior_article_idx on user_behavior (article_id);

-- =============================================================================
-- 8. user_article_scores
-- Persisted per-user feed scores computed by feedScoring.ts.
-- Unique on (user_id, article_id); upserted on every feed load.
-- =============================================================================
create table if not exists user_article_scores (
  id             uuid        primary key default uuid_generate_v4(),
  user_id        text        not null,
  article_id     uuid        not null references articles(id) on delete cascade,
  behavior_score numeric     not null default 0,
  final_score    numeric     not null default 0,
  computed_at    timestamptz not null default now(),
  unique (user_id, article_id)
);

create index if not exists user_article_scores_user_idx
  on user_article_scores (user_id, final_score desc);

-- =============================================================================
-- Row Level Security (RLS)
-- All tables use a simple "local-user" model (single-tenant MVP).
-- Enable RLS and allow full access via the anon key for the fixed user ID.
-- IMPORTANT: tighten these policies before adding real authentication.
-- =============================================================================

alter table articles           enable row level security;
alter table saved_articles     enable row level security;
alter table threat_actions     enable row level security;
alter table user_interests     enable row level security;
alter table user_profiles      enable row level security;
alter table user_preferences   enable row level security;
alter table user_behavior      enable row level security;
alter table user_article_scores enable row level security;

-- articles: anyone can read; only the service role / cron can write
create policy "articles_read_all"   on articles for select using (true);
create policy "articles_insert_all" on articles for insert with check (true);
create policy "articles_update_all" on articles for update using (true);

-- saved_articles: full access (single-user MVP)
create policy "saved_articles_all" on saved_articles for all using (true) with check (true);

-- threat_actions: full access
create policy "threat_actions_all" on threat_actions for all using (true) with check (true);

-- user_interests: full access
create policy "user_interests_all" on user_interests for all using (true) with check (true);

-- user_profiles: full access
create policy "user_profiles_all" on user_profiles for all using (true) with check (true);

-- user_preferences: full access
create policy "user_preferences_all" on user_preferences for all using (true) with check (true);

-- user_behavior: full access
create policy "user_behavior_all" on user_behavior for all using (true) with check (true);

-- user_article_scores: full access
create policy "user_article_scores_all" on user_article_scores for all using (true) with check (true);
