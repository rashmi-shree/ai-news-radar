import { supabase } from "./client";

const USER_ID = "local-user";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserProfile {
  role:            string;
  company:         string;
  domain:          string;
  tools:           string[];
  favorite_topics: string[];
}

type ProfileRow = {
  id:              string;
  user_id:         string;
  role:            string | null;
  company:         string | null;
  domain:          string | null;
  tools:           string[] | null;
  favorite_topics: string[] | null;
  created_at:      string;
  updated_at:      string;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Loads the profile for the local user.
 * Returns null if no profile has been saved yet.
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("role, company, domain, tools, favorite_topics")
    .eq("user_id", USER_ID)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getUserProfile] Query failed:", error.message);
    return null;
  }

  if (!data) return null;

  const row = data as ProfileRow;
  return {
    role:            row.role            ?? "",
    company:         row.company         ?? "",
    domain:          row.domain          ?? "",
    tools:           row.tools           ?? [],
    favorite_topics: row.favorite_topics ?? [],
  };
}

/**
 * Upserts the profile for the local user.
 * Creates on first save, updates on subsequent saves.
 */
export async function saveUserProfile(profile: UserProfile): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("user_profiles")
    .upsert(
      {
        user_id:         USER_ID,
        role:            profile.role.trim()    || null,
        company:         profile.company.trim() || null,
        domain:          profile.domain.trim()  || null,
        tools:           profile.tools,
        favorite_topics: profile.favorite_topics,
        updated_at:      new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("[saveUserProfile] Upsert failed:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
