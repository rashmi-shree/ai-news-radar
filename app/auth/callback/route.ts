import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * GET /auth/callback
 *
 * Supabase redirects here after OAuth (Google / GitHub) and magic-link flows.
 * Steps:
 *   1. Exchange the one-time code for a real session.
 *   2. Ensure the user has a profile row (fallback if the DB trigger didn't fire).
 *   3. Redirect to the intended destination.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/feed";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await ensureUserProfile(supabase, user.id, user.app_metadata?.provider ?? "email");
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth`);
}

// ─── Profile bootstrap ────────────────────────────────────────────────────────

/**
 * Creates default rows for profile / preferences / interests when they are
 * missing.  Uses `ignoreDuplicates: true` so existing customised data is
 * never overwritten — this is safe to call on every login.
 */
async function ensureUserProfile(
  supabase: SupabaseClient,
  userId: string,
  provider: string
) {
  try {
    const isGitHub = provider === "github";

    const tools = isGitHub
      ? ["ChatGPT", "Cursor"]
      : ["ChatGPT", "Codex"];

    const topics = isGitHub
      ? ["AI Agents", "Open Source", "MCP", "GitHub Repos"]
      : ["AI Agents", "MCP", "Open Source", "Research Papers"];

    // user_profiles — one row per user
    await supabase.from("user_profiles").upsert(
      {
        user_id:         userId,
        role:            "Developer",
        tools,
        favorite_topics: [],
        updated_at:      new Date().toISOString(),
      },
      { onConflict: "user_id", ignoreDuplicates: true }
    );

    // user_preferences — topics drive feed personalisation
    await supabase.from("user_preferences").upsert(
      {
        user_id:    userId,
        topics,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id", ignoreDuplicates: true }
    );

    // user_interests — one row per topic, read by the feed scorer
    if (topics.length > 0) {
      await supabase.from("user_interests").upsert(
        topics.map((topic) => ({ user_id: userId, topic })),
        { onConflict: "user_id,topic", ignoreDuplicates: true }
      );
    }
  } catch (err) {
    // Profile bootstrap is best-effort — never block the redirect
    console.warn("[auth/callback] ensureUserProfile failed:", err);
  }
}
