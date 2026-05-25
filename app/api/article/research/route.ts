import { supabase } from "@/src/lib/supabase/client";
import { generateResearchBrief } from "@/src/lib/ai/research";
import type { ResearchBrief } from "@/src/lib/ai/research";

// ─── GET /api/article/research?id={articleId} ─────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ ok: false, error: "Missing id" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("articles")
    .select("research_brief")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const brief = (data as { research_brief: ResearchBrief | null } | null)?.research_brief ?? null;
  return Response.json({ ok: true, brief });
}

// ─── POST /api/article/research ───────────────────────────────────────────────

export async function POST(request: Request) {
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

  // Fetch the article
  const { data, error: fetchError } = await supabase
    .from("articles")
    .select("id, title, summary, ai_summary, category")
    .eq("id", articleId)
    .maybeSingle();

  if (fetchError || !data) {
    return Response.json({ ok: false, error: "Article not found" }, { status: 404 });
  }

  const row = data as {
    id: string;
    title: string;
    summary: string;
    ai_summary: string;
    category: string;
  };

  // Generate the research brief
  let brief: ResearchBrief;
  try {
    brief = await generateResearchBrief({
      title:      row.title,
      summary:    row.summary,
      category:   row.category,
      ai_summary: row.ai_summary,
    });
  } catch (err) {
    console.error("[RESEARCH] Generation error:", err);
    return Response.json({ ok: false, error: "Generation failed" }, { status: 500 });
  }

  // Persist to the articles table
  const { error: saveError } = await supabase
    .from("articles")
    .update({ research_brief: brief })
    .eq("id", articleId);

  if (saveError) {
    // Return the brief even if save fails — client can still display it
    console.error("[RESEARCH] Save failed:", saveError.message);
    return Response.json({ ok: true, brief, saved: false });
  }

  return Response.json({ ok: true, brief, saved: true });
}
