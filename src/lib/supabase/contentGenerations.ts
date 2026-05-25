import { supabase } from "./client";
import type { ContentType, ContentGeneration } from "../ai/contentGeneration";

const USER_ID = "local-user";

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getContentGeneration(
  articleId: string,
  type:      ContentType
): Promise<ContentGeneration | null> {
  const { data, error } = await supabase
    .from("content_generations")
    .select("type, hook, body, cta, generated_at")
    .eq("user_id",    USER_ID)
    .eq("article_id", articleId)
    .eq("type",       type)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    type:         ContentType;
    hook:         string;
    body:         string;
    cta:          string;
    generated_at: string;
  };

  return {
    type:         row.type,
    hook:         row.hook,
    body:         row.body,
    cta:          row.cta,
    generated_at: row.generated_at,
  };
}

/** Returns all generated content types for an article in one query. */
export async function getAllContentGenerations(
  articleId: string
): Promise<Partial<Record<ContentType, ContentGeneration>>> {
  const { data, error } = await supabase
    .from("content_generations")
    .select("type, hook, body, cta, generated_at")
    .eq("user_id",    USER_ID)
    .eq("article_id", articleId);

  if (error || !data) return {};

  const result: Partial<Record<ContentType, ContentGeneration>> = {};
  for (const row of data as ContentGeneration[]) {
    result[row.type] = row;
  }
  return result;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function saveContentGeneration(
  articleId: string,
  content:   ContentGeneration
): Promise<{ ok: boolean; error?: string }> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("content_generations")
    .upsert(
      {
        user_id:      USER_ID,
        article_id:   articleId,
        type:         content.type,
        hook:         content.hook,
        body:         content.body,
        cta:          content.cta,
        generated_at: content.generated_at,
        updated_at:   now,
      },
      { onConflict: "user_id,article_id,type" }
    );

  if (error) {
    console.error("[CONTENT GENERATIONS] save failed:", error.message);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
