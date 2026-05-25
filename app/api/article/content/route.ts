import { supabase } from "@/src/lib/supabase/client";
import { generateContent, type ContentType } from "@/src/lib/ai/contentGeneration";
import { saveContentGeneration, getAllContentGenerations } from "@/src/lib/supabase/contentGenerations";

const VALID_TYPES = new Set<string>(["reel", "youtube", "linkedin"]);

// ─── GET /api/article/content?articleId={id} ──────────────────────────────────
// Returns all stored content generations for the article.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("articleId");

  if (!articleId) {
    return Response.json({ ok: false, error: "Missing articleId" }, { status: 400 });
  }

  const generations = await getAllContentGenerations(articleId);
  return Response.json({ ok: true, generations });
}

// ─── POST /api/article/content ────────────────────────────────────────────────
// Generates and stores content for a specific type.

export async function POST(request: Request) {
  let body: { articleId?: string; type?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { articleId, type } = body;

  if (!articleId) {
    return Response.json({ ok: false, error: "Missing articleId" }, { status: 400 });
  }
  if (!type || !VALID_TYPES.has(type)) {
    return Response.json(
      { ok: false, error: "type must be one of: reel, youtube, linkedin" },
      { status: 400 }
    );
  }

  // Fetch the article
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

  // Generate
  let content;
  try {
    content = await generateContent(type as ContentType, {
      title:    row.title,
      summary:  row.ai_summary || row.summary,
      category: row.category,
    });
  } catch (err) {
    console.error("[CONTENT] Generation error:", err);
    return Response.json({ ok: false, error: "Generation failed" }, { status: 500 });
  }

  // Store
  const { ok, error: saveError } = await saveContentGeneration(articleId, content);
  if (!ok) {
    console.error("[CONTENT] Save failed:", saveError);
    return Response.json({ ok: true, content, saved: false });
  }

  return Response.json({ ok: true, content, saved: true });
}
