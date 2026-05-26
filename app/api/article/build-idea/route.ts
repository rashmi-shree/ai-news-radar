import { supabase } from "@/src/lib/supabase/client";
import { generateBuildIdea } from "@/src/lib/ai/buildIdea";
import { saveBuildIdea, getBuildIdea } from "@/src/lib/supabase/builderActions";
import { getServerUser } from "@/src/lib/supabase/server";

// ─── GET /api/article/build-idea?articleId={id} ───────────────────────────────

export async function GET(request: Request) {
  const user = await getServerUser();
  if (!user) return Response.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("articleId");

  if (!articleId) {
    return Response.json({ ok: false, error: "Missing articleId" }, { status: 400 });
  }

  const idea = await getBuildIdea(user.id, articleId);
  return Response.json({ ok: true, idea });
}

// ─── POST /api/article/build-idea ─────────────────────────────────────────────

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) return Response.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  let body: { articleId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { articleId } = body;
  if (!articleId) {
    return Response.json({ ok: false, error: "Missing articleId" }, { status: 400 });
  }

  // Fetch the article for context
  const { data, error: fetchError } = await supabase
    .from("articles")
    .select("title, summary, ai_summary, category")
    .eq("id", articleId)
    .maybeSingle();

  if (fetchError || !data) {
    return Response.json({ ok: false, error: "Article not found" }, { status: 404 });
  }

  const row = data as {
    title:      string;
    summary:    string;
    ai_summary: string;
    category:   string;
  };

  // Generate the idea
  let idea;
  try {
    idea = await generateBuildIdea({
      title:    row.title,
      summary:  row.ai_summary || row.summary,
      category: row.category,
    });
  } catch (err) {
    console.error("[BUILD IDEA] Generation error:", err);
    return Response.json({ ok: false, error: "Generation failed" }, { status: 500 });
  }

  // Store in builder_actions
  const { ok, error: saveError } = await saveBuildIdea(user.id, articleId, idea);
  if (!ok) {
    // Return idea even if save fails
    console.error("[BUILD IDEA] Save failed:", saveError);
    return Response.json({ ok: true, idea, saved: false });
  }

  return Response.json({ ok: true, idea, saved: true });
}
