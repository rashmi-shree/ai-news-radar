-- =============================================================================
-- Migration 007 — Collections
-- user_collections: named article lists per user.
-- collection_articles: many-to-many junction with ordering.
-- Run in the Supabase SQL Editor or via Supabase CLI.
-- =============================================================================

-- ── 1. Collections ────────────────────────────────────────────────────────────

create table if not exists user_collections (
  id          uuid        primary key default gen_random_uuid(),
  user_id     text        not null default 'local-user',
  name        text        not null,
  description text,
  color       text        not null default 'zinc',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint user_collections_color_check
    check (color in ('zinc','rose','amber','violet','sky','emerald','orange'))
);

create index if not exists user_collections_user_idx on user_collections (user_id);

comment on table user_collections is
  'Named article collections created by a user (AI Agents, Startup Ideas, etc.).';

-- ── 2. Collection articles ────────────────────────────────────────────────────

create table if not exists collection_articles (
  id            uuid        primary key default gen_random_uuid(),
  collection_id uuid        not null references user_collections(id) on delete cascade,
  article_id    text        not null,
  user_id       text        not null default 'local-user',
  added_at      timestamptz not null default now(),

  constraint collection_articles_unique
    unique (collection_id, article_id)
);

create index if not exists collection_articles_collection_idx on collection_articles (collection_id);
create index if not exists collection_articles_article_idx    on collection_articles (article_id);
create index if not exists collection_articles_user_idx       on collection_articles (user_id);

comment on table collection_articles is
  'Articles pinned to a user collection. Unique per (collection, article).';

-- ── 3. Seed default collections ───────────────────────────────────────────────
-- Optional: insert starter collections for the default local user.

insert into user_collections (user_id, name, description, color) values
  ('local-user', 'AI Agents',       'Autonomous agent releases and frameworks', 'violet'),
  ('local-user', 'Startup Ideas',   'Articles with product potential',          'amber'),
  ('local-user', 'Reel Ideas',      'Great candidates for short-form content',  'rose'),
  ('local-user', 'Repos To Explore','Open-source repos worth digging into',     'emerald'),
  ('local-user', 'Research',        'Papers and deep technical reads',          'sky')
on conflict do nothing;
