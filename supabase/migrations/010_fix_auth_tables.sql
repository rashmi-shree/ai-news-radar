-- =============================================================================
-- AI News Radar — Migration 010: Auth table corrections
--
-- Fixes applied:
--   1. Replaces handle_new_user() trigger with a version that stores topic
--      labels matching the app's personalization system.
--   2. Grants the `authenticated` role the privileges it needs so queries
--      made via the SSR server client (which carries the user's JWT) work
--      correctly once strict RLS is in effect.
--   3. Adds `anon` read access to `articles` so the public feed still loads
--      for unauthenticated visitors.
-- =============================================================================

-- ─── 1. Updated handle_new_user trigger ──────────────────────────────────────
--
-- Topic labels used here must match the app's TOPIC_LABELS map in
-- src/lib/personalization.ts so feed scoring works out of the box.
--
-- GitHub  → ChatGPT + Cursor  |  MCP, GitHub Repos, Coding Agents, Research Papers
-- Others  → ChatGPT + Codex   |  MCP, Research Papers, OpenAI, Coding Agents

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid      text  := new.id::text;
  provider text  := coalesce(new.app_metadata->>'provider', 'email');
  tools    jsonb;
  topics   jsonb;
begin
  if provider = 'github' then
    tools  := '["ChatGPT", "Cursor"]'::jsonb;
    topics := '["MCP", "GitHub Repos", "Coding Agents", "Research Papers"]'::jsonb;
  else
    tools  := '["ChatGPT", "Codex"]'::jsonb;
    topics := '["MCP", "Research Papers", "OpenAI", "Coding Agents"]'::jsonb;
  end if;

  insert into public.user_profiles (user_id, role, tools, favorite_topics)
  values (uid, 'Developer', tools, '[]'::jsonb)
  on conflict (user_id) do nothing;

  insert into public.user_preferences (user_id, topics)
  values (uid, topics)
  on conflict (user_id) do nothing;

  insert into public.user_interests (user_id, topic)
  select uid, t
  from   jsonb_array_elements_text(topics) as t
  on conflict (user_id, topic) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─── 2. Grant schema access to authenticated + anon roles ────────────────────
--
-- Supabase projects created after 2023 include these grants by default,
-- but older projects may be missing them.  Running these is idempotent.

grant usage on schema public to anon, authenticated;

-- articles: public read for feed; write only via service role / cron
grant select          on public.articles to anon, authenticated;
grant insert, update  on public.articles to authenticated;

-- user tables: full CRUD for the owning authenticated user
grant select, insert, update, delete on
  public.saved_articles,
  public.threat_actions,
  public.user_interests,
  public.user_profiles,
  public.user_preferences,
  public.user_behavior,
  public.user_article_scores,
  public.builder_actions,
  public.content_generations,
  public.user_collections,
  public.collection_articles
to authenticated;

-- sequences (for any serial/bigserial columns)
grant usage, select on all sequences in schema public to authenticated;


-- ─── 3. Ensure RLS is enabled on every user table ────────────────────────────
--
-- These are idempotent — enabling RLS on an already-enabled table is a no-op.

alter table public.saved_articles      enable row level security;
alter table public.threat_actions      enable row level security;
alter table public.user_interests      enable row level security;
alter table public.user_profiles       enable row level security;
alter table public.user_preferences    enable row level security;
alter table public.user_behavior       enable row level security;
alter table public.user_article_scores enable row level security;
alter table public.builder_actions     enable row level security;
alter table public.content_generations enable row level security;
alter table public.user_collections    enable row level security;
alter table public.collection_articles enable row level security;


-- ─── 4. Verify unique constraint for upsert on user_interests ────────────────
--
-- Migration 001 defined `unique (user_id, topic)` inline; this gives it an
-- explicit name so the JS client's `onConflict: "user_id,topic"` can resolve it.

alter table public.user_interests
  drop constraint if exists user_interests_user_id_topic_key;

alter table public.user_interests
  add constraint user_interests_user_id_topic_key unique (user_id, topic);
