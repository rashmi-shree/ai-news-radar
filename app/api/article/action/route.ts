import { supabase } from "@/src/lib/supabase/client";
import { logBehavior, type BehaviorEvent } from "@/src/lib/supabase/userBehavior";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnalystAction = "saved" | "investigating" | "reviewed" | "ignored" | "remove";

const VALID_ACTIONS = new Set<AnalystAction>([
  "saved",
  "investigating",
  "reviewed",
  "ignored",
  "remove",
]);

// AnalystAction uses "saved" but BehaviorEvent uses "save" — normalise before logging.
const ANALYST_TO_BEHAVIOR: Record<Exclude<AnalystAction, "remove">, BehaviorEvent> = {
  saved:         "save",
  investigating: "investigating",
  reviewed:      "reviewed",
  ignored:       "ignored",
};

const USER_ID = "local-user";

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/article/action
 *
 * Payload: { articleId: string; action: AnalystAction }
 *
 * Strategy — delete-then-insert:
 *   1. DELETE all rows for (article_id, user_id)  →  clears duplicates.
 *   2. For status actions: INSERT one fresh row.
 *   3. For "remove": step 1 is the complete operation.
 *
 * If the insert fails after delete, the previous row is restored so the
 * article is never silently lost from the workspace.
 *
 * One article = one status. No unique DB constraint required.
 */
export async function POST(request: Request) {
  let body: { articleId?: string; action?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { articleId, action } = body;

  if (!articleId || !action || !VALID_ACTIONS.has(action as AnalystAction)) {
    return Response.json(
      { ok: false, error: "Missing or invalid articleId / action" },
      { status: 400 }
    );
  }

  const typedAction = action as AnalystAction;
  const now = new Date().toISOString();

  // ── 1. Read the existing row before deleting (needed for rollback + notes preservation) ──
  const { data: existing } = await supabase
    .from("saved_articles")
    .select("article_id, user_id, action, status, notes, created_at, updated_at")
    .eq("article_id", articleId)
    .eq("user_id", USER_ID)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1);

  const previousRow = (existing as Record<string, string | null>[] | null)?.[0] ?? null;

  // ── 2. Delete all rows for this article + user ────────────────────────────
  const { error: deleteError } = await supabase
    .from("saved_articles")
    .delete()
    .eq("article_id", articleId)
    .eq("user_id", USER_ID);

  if (deleteError) {
    console.error("[ACTION] delete failed:", deleteError.message);
    return Response.json({ ok: false, error: deleteError.message }, { status: 500 });
  }

  // ── 3. Remove — delete was the complete operation ─────────────────────────
  if (typedAction === "remove") {
    void logAction(articleId, "removed");
    void logBehavior(articleId, "removed");
    return Response.json({ ok: true, status: null });
  }

  // ── 4. Insert the single authoritative row ────────────────────────────────
  const { error: insertError } = await supabase
    .from("saved_articles")
    .insert({
      article_id:  articleId,
      user_id:     USER_ID,
      action:      typedAction,
      status:      typedAction,
      notes:       previousRow?.notes ?? null,   // carry notes forward across status changes
      created_at:  previousRow?.created_at ?? now,
      updated_at:  now,
    });

  if (insertError) {
    console.error("[ACTION] insert failed:", insertError.message);

    // Restore the previous row so the article is not silently lost
    if (previousRow) {
      await supabase.from("saved_articles").insert({
        ...previousRow,
        updated_at: previousRow.updated_at ?? previousRow.created_at,
      });
      console.warn(`[ACTION] rolled back to previous status="${previousRow.status}" for article=${articleId}`);
    }

    return Response.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  void logAction(articleId, typedAction);
  void logBehavior(articleId, ANALYST_TO_BEHAVIOR[typedAction]);
  return Response.json({ ok: true, status: typedAction });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fire-and-forget: append an entry to the threat_actions audit log. */
async function logAction(articleId: string, action: string): Promise<void> {
  const { error } = await supabase
    .from("threat_actions")
    .insert({ article_id: articleId, user_id: USER_ID, action });

  if (error) {
    console.warn("[ACTION LOG] threat_actions insert failed:", error.message);
  }
}

