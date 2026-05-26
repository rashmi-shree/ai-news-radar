-- =============================================================================
-- AI News Radar — Migration 008: Supabase Auth + Row Level Security
--
-- Run this in the Supabase SQL Editor after enabling Supabase Auth in the
-- project dashboard. It:
--
--   1. Drops the old "allow all" policies on user tables.
--   2. Adds proper per-user RLS policies keyed on auth.uid().
--   3. Creates a trigger that auto-provisions a default user_profile + 
--      user_preferences + user_interests record when a new user signs up.
-- =============================================================================

-- ─── 1. Tighten RLS on user-scoped tables ─────────────────────────────────────

-- saved_articles
drop policy if exists "saved_articles_all" on saved_articles;
create policy "saved_articles_own" on saved_articles
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- threat_actions (audit log)
drop policy if exists "threat_actions_all" on threat_actions;
create policy "threat_actions_own" on threat_actions
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- user_interests
drop policy if exists "user_interests_all" on user_interests;
create policy "user_interests_own" on user_interests
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- user_profiles
drop policy if exists "user_profiles_all" on user_profiles;
create policy "user_profiles_own" on user_profiles
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- user_preferences
drop policy if exists "user_preferences_all" on user_preferences;
create policy "user_preferences_own" on user_preferences
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- user_behavior
drop policy if exists "user_behavior_all" on user_behavior;
create policy "user_behavior_own" on user_behavior
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- user_article_scores
drop policy if exists "user_article_scores_all" on user_article_scores;
create policy "user_article_scores_own" on user_article_scores
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- builder_actions (build ideas per user)
alter table builder_actions enable row level security;
drop policy if exists "builder_actions_all" on builder_actions;
create policy "builder_actions_own" on builder_actions
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- content_generations (reel/youtube/linkedin per user)
alter table content_generations enable row level security;
drop policy if exists "content_generations_all" on content_generations;
create policy "content_generations_own" on content_generations
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- user_collections
alter table user_collections enable row level security;
drop policy if exists "user_collections_all" on user_collections;
create policy "user_collections_own" on user_collections
  for all
  using  (auth.uid()::text = user_id)
  with check (auth.uid()::text = user_id);

-- collection_articles (owned by the collection owner)
alter table collection_articles enable row level security;
drop policy if exists "collection_articles_all" on collection_articles;
create policy "collection_articles_own" on collection_articles
  for all
  using (
    exists (
      select 1 from user_collections uc
      where uc.id = collection_articles.collection_id
        and uc.user_id = auth.uid()::text
    )
  )
  with check (
    exists (
      select 1 from user_collections uc
      where uc.id = collection_articles.collection_id
        and uc.user_id = auth.uid()::text
    )
  );


-- ─── 2. Auto-provision user profile on sign-up ────────────────────────────────

-- The function runs as SECURITY DEFINER so it can write to user tables
-- even though the anon role doesn't have INSERT access normally.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid text := new.id::text;
begin
  -- Create a default profile (role: Developer, tools: ChatGPT + Codex)
  insert into public.user_profiles (user_id, role, tools, favorite_topics)
  values (
    uid,
    'Developer',
    '["ChatGPT", "Codex"]'::jsonb,
    '[]'::jsonb
  )
  on conflict (user_id) do nothing;

  -- Create default preferences
  insert into public.user_preferences (user_id, topics)
  values (uid, '[]'::jsonb)
  on conflict (user_id) do nothing;

  -- Seed default interests
  insert into public.user_interests (user_id, topic)
  values
    (uid, 'AI Agents'),
    (uid, 'MCP'),
    (uid, 'Open Source'),
    (uid, 'Research Papers')
  on conflict (user_id, topic) do nothing;

  return new;
end;
$$;

-- Attach the trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─── 3. Ensure Google OAuth redirect is allowed ───────────────────────────────
-- Run this in your Supabase project dashboard under:
--   Authentication → URL Configuration → Redirect URLs
-- Add:  http://localhost:3000/auth/callback
--       https://<your-production-domain>/auth/callback
--
-- This cannot be done via SQL, but is noted here for reference.
