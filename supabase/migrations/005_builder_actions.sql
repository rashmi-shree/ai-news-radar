-- =============================================================================
-- Migration 005 — Builder Actions
-- Stores user-generated builder actions (build ideas, future: integrations, etc.)
-- Run in the Supabase SQL Editor or via Supabase CLI.
-- =============================================================================

create table if not exists builder_actions (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null default 'local-user',
  article_id text not null,
  type       text not null,
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One active action per (user, article, type)
  constraint builder_actions_user_article_type_key
    unique (user_id, article_id, type),

  constraint builder_actions_type_check
    check (type in ('build'))
);

-- Indexes
create index if not exists builder_actions_user_idx    on builder_actions (user_id);
create index if not exists builder_actions_article_idx on builder_actions (article_id);
create index if not exists builder_actions_type_idx    on builder_actions (type);

comment on table builder_actions is
  'User-generated AI builder actions keyed by (user_id, article_id, type). '
  'Payload schema varies by type. Currently supported: build.';
