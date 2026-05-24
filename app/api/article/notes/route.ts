import { supabase } from "@/src/lib/supabase/client";

const USER_ID = "local-user";

/**
 * PATCH /api/article/notes
 *
 * Payload: { articleId: string; notes: string }
 *
 * Updates the `notes` column on the existing saved_articles row for this
 * article. Requires the article to already be tracked (saved / investigating /
 * reviewed / ignored). If no row exists, returns 404 so the client can prompt
 * the user to track the article first.
 */
export async function PATCH(request: Request) {
  let body: { articleId?: string; notes?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { articleId, notes } = body;

  if (!articleId || typeof notes !== "string") {
    return Response.json(
      { ok: false, error: "Missing articleId or notes" },
      { status: 400 }
    );
  }

  // Verify a row exists first
  const { data: existing } = await supabase
    .from("saved_articles")
    .select("id")
    .eq("article_id", articleId)
    .eq("user_id", USER_ID)
    .limit(1);

  if (!existing?.length) {
    return Response.json(
      { ok: false, error: "Article not tracked — save or investigate it first" },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from("saved_articles")
    .update({ notes: notes.trim() || null, updated_at: new Date().toISOString() })
    .eq("article_id", articleId)
    .eq("user_id", USER_ID);

  if (error) {
    console.error("[NOTES] update failed:", error.message);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
