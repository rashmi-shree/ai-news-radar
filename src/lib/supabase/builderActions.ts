import { supabase } from "./client";
import type { BuildIdea } from "../ai/buildIdea";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BuilderActionType = "build";

export interface BuilderAction {
  id:         string;
  userId:     string;
  articleId:  string;
  type:       BuilderActionType;
  payload:    BuildIdea;
  createdAt:  string;
  updatedAt:  string;
}

const USER_ID = "local-user";

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getBuildIdea(
  articleId: string
): Promise<BuildIdea | null> {
  const { data, error } = await supabase
    .from("builder_actions")
    .select("payload")
    .eq("user_id", USER_ID)
    .eq("article_id", articleId)
    .eq("type", "build")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return (data as { payload: BuildIdea }).payload;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function saveBuildIdea(
  articleId: string,
  idea:      BuildIdea
): Promise<{ ok: boolean; error?: string }> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("builder_actions")
    .upsert(
      {
        user_id:    USER_ID,
        article_id: articleId,
        type:       "build",
        payload:    idea,
        updated_at: now,
      },
      { onConflict: "user_id,article_id,type" }
    );

  if (error) {
    console.error("[BUILDER ACTIONS] saveBuildIdea failed:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
