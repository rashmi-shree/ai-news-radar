-- =============================================================================
-- Migration 003 — Builder Score
-- Renames threat_score → builder_score and adds new score component columns.
-- Run in the Supabase SQL Editor or via Supabase CLI.
-- =============================================================================

-- ── 1. Add new builder score columns ─────────────────────────────────────────

alter table articles
  add column if not exists builder_score           integer default 0,
  add column if not exists virality_score          integer default 0,
  add column if not exists build_potential_score   integer default 0,
  add column if not exists content_potential_score integer default 0,
  add column if not exists technical_depth_score   integer default 0;

-- ── 2. Back-fill from old columns (if they exist) ────────────────────────────
-- Copy threat_score → builder_score so existing data is preserved.

update articles
set
  builder_score         = coalesce(threat_score, 0),
  virality_score        = coalesce(signal_score, 0),
  build_potential_score = coalesce(interest_score, 0),
  technical_depth_score = coalesce(risk_score, 0),
  -- content_potential approximated from relevance_score
  content_potential_score =
    case
      when relevance_score >= 20 then 20
      when relevance_score >= 12 then 15
      when relevance_score >= 6  then 10
      else 5
    end
where builder_score = 0;

-- ── 3. Indexes ────────────────────────────────────────────────────────────────

create index if not exists articles_builder_score_idx on articles (builder_score desc);

-- ── 4. (Optional) Keep old columns for rollback safety ───────────────────────
-- Uncomment these lines once you have confirmed the new columns are working:
--
-- alter table articles
--   drop column if exists threat_score,
--   drop column if exists signal_score,
--   drop column if exists interest_score,
--   drop column if exists risk_score;
