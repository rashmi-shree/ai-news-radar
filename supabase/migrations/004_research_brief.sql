-- =============================================================================
-- Migration 004 — Research Brief
-- Adds research_brief JSONB column to articles.
-- Run in the Supabase SQL Editor or via Supabase CLI.
-- =============================================================================

alter table articles
  add column if not exists research_brief jsonb default null;

-- Index for quickly finding articles that have a research brief (analytics/feed)
create index if not exists articles_research_brief_idx
  on articles ((research_brief is not null));

comment on column articles.research_brief is
  'AI-generated builder research brief. Populated on demand. Schema: '
  '{ what_happened, why_builders_care, use_cases[], risks[], time_to_learn, generated_at }';
