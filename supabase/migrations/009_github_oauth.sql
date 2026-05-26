-- =============================================================================
-- AI News Radar — Migration 009: GitHub OAuth + provider-aware defaults
--
-- Replaces the handle_new_user() trigger function from migration 008 with a
-- version that detects the sign-up provider and seeds provider-specific
-- default tools and topics.
--
-- Provider  | Default tools         | Default topics
-- ----------+-----------------------+----------------------------------------
-- github    | ChatGPT, Cursor       | AI Agents, Open Source, MCP, GitHub Repos
-- google    | ChatGPT, Codex        | AI Agents, MCP, Open Source, Research Papers
-- email     | ChatGPT, Codex        | AI Agents, MCP, Open Source, Research Papers
-- (other)   | ChatGPT, Codex        | AI Agents, MCP, Open Source, Research Papers
-- =============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uid      text    := new.id::text;
  provider text    := coalesce(new.app_metadata->>'provider', 'email');
  tools    jsonb;
  topics   jsonb;
begin
  -- Provider-specific defaults
  if provider = 'github' then
    tools  := '["ChatGPT", "Cursor"]'::jsonb;
    topics := '["AI Agents", "Open Source", "MCP", "GitHub Repos"]'::jsonb;
  else
    -- google, email, magic_link, etc.
    tools  := '["ChatGPT", "Codex"]'::jsonb;
    topics := '["AI Agents", "MCP", "Open Source", "Research Papers"]'::jsonb;
  end if;

  -- Upsert profile (on conflict = user signed in with a second provider,
  -- don't overwrite an existing profile they may have already customised)
  insert into public.user_profiles (user_id, role, tools, favorite_topics)
  values (uid, 'Developer', tools, '[]'::jsonb)
  on conflict (user_id) do nothing;

  -- Upsert preferences (topics for feed ranking)
  insert into public.user_preferences (user_id, topics)
  values (uid, topics)
  on conflict (user_id) do nothing;

  -- Seed interests (one row per topic)
  -- Topics array is constructed from the jsonb value above
  insert into public.user_interests (user_id, topic)
  select uid, topic_value
  from   jsonb_array_elements_text(topics) as t(topic_value)
  on conflict (user_id, topic) do nothing;

  return new;
end;
$$;

-- Re-attach the trigger (drop + create is idempotent)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =============================================================================
-- Supabase Dashboard checklist for GitHub OAuth
-- =============================================================================
-- 1. Authentication → Providers → GitHub → Enable
--    Client ID  : <your GitHub OAuth App client ID>
--    Client Secret: <your GitHub OAuth App client secret>
--
-- 2. GitHub OAuth App callback URL (set in your GitHub app settings):
--      https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
--
-- 3. Authentication → URL Configuration → Redirect URLs — ensure these are listed:
--      http://localhost:3000/auth/callback
--      https://<your-production-domain>/auth/callback
-- =============================================================================
