import { supabase } from "@/src/lib/supabase/client";
import { logBehavior, type BehaviorEvent } from "@/src/lib/supabase/userBehavior";
import { getServerUser } from "@/src/lib/supabase/server";

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

// ─── Route handler ────────────────────────────────────────────────────────────

/**
 * POST /api/article/action
 *
 * Payload: { articleId: string; action: AnalystAction }
 */
export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) {
    return Response.json({ ok: false, error: "Unauthenticated" }, { status: 401 });
  }
  const userId = user.id;

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

  // ── 1. Read the existing row before deleting (needed for rollback + notes) ──
  const { data: existing } = await supabase
    .from("saved_articles")
    .select("article_id, user_id, action, status, notes, created_at, updated_at")
    .eq("article_id", articleId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1);

  const previousRow = (existing as Record<string, string | null>[] | null)?.[0] ?? null;

  // ── 2. Delete all rows for this article + user ────────────────────────────
  const { error: deleteError } = await supabase
    .from("saved_articles")
    .delete()
    .eq("article_id", articleId)
    .eq("user_id", userId);

  if (deleteError) {
    console.error("[ACTION] delete failed:", deleteError.message);
    return Response.json({ ok: false, error: deleteError.message }, { status: 500 });
  }

  // ── 3. Remove — delete was the complete operation ─────────────────────────
  if (typedAction === "remove") {
    void logAction(userId, articleId, "removed");
    void logBehavior(userId, articleId, "removed");
    return Response.json({ ok: true, status: null });
  }

  // ── 4. Insert the single authoritative row ────────────────────────────────
  const { error: insertError } = await supabase
    .from("saved_articles")
    .insert({
      article_id:  articleId,
      user_id:     userId,
      action:      typedAction,
      status:      typedAction,
      notes:       previousRow?.notes ?? null,
      created_at:  previousRow?.created_at ?? now,
      updated_at:  now,
    });

  if (insertError) {
    console.error("[ACTION] insert failed:", insertError.message);
    if (previousRow) {
      await supabase.from("saved_articles").insert({
        ...previousRow,
        updated_at: previousRow.updated_at ?? previousRow.created_at,
      });
    }
    return Response.json({ ok: false, error: insertError.message }, { status: 500 });
  }

  void logAction(userId, articleId, typedAction);
  void logBehavior(userId, articleId, ANALYST_TO_BEHAVIOR[typedAction]);
  return Response.json({ ok: true, status: typedAction });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function logAction(userId: string, articleId: string, action: string): Promise<void> {
  const { error } = await supabase
    .from("threat_actions")
    .insert({ article_id: articleId, user_id: userId, action });
  if (error) console.warn("[ACTION LOG] threat_actions insert failed:", error.message);
}
