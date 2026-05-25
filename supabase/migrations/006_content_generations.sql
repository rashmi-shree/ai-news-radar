-- =============================================================================
-- Migration 006 — Content Generations
-- Stores AI-generated content (reel, youtube, linkedin) per article per user.
-- Run in the Supabase SQL Editor or via Supabase CLI.
-- =============================================================================

create table if not exists content_generations (
  id           uuid primary key default gen_random_uuid(),
  user_id      text        not null default 'local-user',
  article_id   text        not null,
  type         text        not null,
  hook         text        not null default '',
  body         text        not null default '',
  cta          text        not null default '',
  generated_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- One generation per (user, article, content type)
  constraint content_generations_user_article_type_key
    unique (user_id, article_id, type),

  constraint content_generations_type_check
    check (type in ('reel', 'youtube', 'linkedin'))
);

-- Indexes
create index if not exists content_generations_user_idx    on content_generations (user_id);
create index if not exists content_generations_article_idx on content_generations (article_id);
create index if not exists content_generations_type_idx    on content_generations (type);

comment on table content_generations is
  'AI-generated content scripts for each article. One row per (user, article, type). '
  'Types: reel (short-form), youtube (long-form), linkedin (professional post).';
