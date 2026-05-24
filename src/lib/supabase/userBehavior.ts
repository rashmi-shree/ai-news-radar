import { supabase } from "./client";

const USER_ID = "local-user";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BehaviorEvent =
  | "view"
  | "save"
  | "investigating"
  | "reviewed"
  | "ignored"
  | "removed";

export interface BehaviorRow {
  articleId: string;
  category:  string;
  event:     BehaviorEvent;
  createdAt: string;
}

// Points added to category affinity per event type.
// Negative for ignored signals the user isn't interested.
export const EVENT_WEIGHTS: Record<BehaviorEvent, number> = {
  view:          1,
  save:          3,
  investigating: 5,
  reviewed:      2,
  ignored:       -2,
  removed:       -1,
};

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Appends one behavior event to user_behavior.
 * Fire-and-forget — never throws.
 */
export async function logBehavior(
  articleId: string,
  event: BehaviorEvent
): Promise<void> {
  const { error } = await supabase.from("user_behavior").insert({
    user_id:    USER_ID,
    article_id: articleId,
    event,
  });

  if (error) {
    console.warn(`[BEHAVIOR] insert failed (${event}):`, error.message);
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────

/**
 * Returns the last `limit` behavior rows for the local user,
 * joined with the article category so affinity can be computed.
 *
 * The join is done in two queries (Supabase JS doesn't support FK-based
 * select across tables without a view), and the result is merged client-side.
 */
export async function getBehaviorHistory(limit = 500): Promise<BehaviorRow[]> {
  // 1. Fetch behavior rows
  const { data: behaviorData, error: behaviorError } = await supabase
    .from("user_behavior")
    .select("article_id, event, created_at")
    .eq("user_id", USER_ID)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (behaviorError || !behaviorData?.length) {
    if (behaviorError) console.warn("[BEHAVIOR] fetch failed:", behaviorError.message);
    return [];
  }

  // 2. Collect unique article IDs
  const articleIds = [...new Set(behaviorData.map((r) => r.article_id as string))];

  // 3. Fetch categories for those articles
  const { data: articleData, error: articleError } = await supabase
    .from("articles")
    .select("id, category")
    .in("id", articleIds);

  if (articleError) {
    console.warn("[BEHAVIOR] article lookup failed:", articleError.message);
  }

  const categoryMap = new Map<string, string>(
    (articleData ?? []).map((a) => [a.id as string, a.category as string])
  );

  // 4. Merge
  return behaviorData.map((r) => ({
    articleId: r.article_id as string,
    category:  categoryMap.get(r.article_id as string) ?? "Unknown",
    event:     r.event as BehaviorEvent,
    createdAt: r.created_at as string,
  }));
}
