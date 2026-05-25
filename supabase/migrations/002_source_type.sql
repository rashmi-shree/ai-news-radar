-- =============================================================================
-- Migration 002 — Add source_type to articles
-- Run in the Supabase SQL Editor or via Supabase CLI.
-- =============================================================================

-- Add source_type column
alter table articles
  add column if not exists source_type text;

-- Back-fill existing rows using category as a proxy
update articles set source_type =
  case category
    when 'Research Papers' then 'paper'
    when 'GitHub Repos'    then 'repo'
    when 'AI Startups'     then 'startup'
    when 'Benchmarks'      then 'benchmark'
    when 'Security'        then 'security'
    when 'OpenAI'          then 'release'
    when 'Anthropic'       then 'release'
    when 'Coding Agents'   then 'tool'
    when 'MCP'             then 'tool'
    when 'Tools'           then 'tool'
    else                        'tool'
  end
where source_type is null;

-- Index for source_type filtering (feed filter, analytics)
create index if not exists articles_source_type_idx on articles (source_type);

-- Add a check constraint so only the 7 allowed values can be stored
alter table articles
  drop constraint if exists articles_source_type_check;

alter table articles
  add constraint articles_source_type_check
  check (
    source_type is null or
    source_type in ('release', 'tool', 'repo', 'paper', 'startup', 'benchmark', 'security')
  );
