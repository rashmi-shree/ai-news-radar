import { supabase } from "@/src/lib/supabase/client";
import { computeBuilderScore } from "@/src/lib/scoring/threatScore";

/**
 * POST /api/realtime/test
 *
 * Inserts a synthetic "High Signal" article into Supabase with
 * fully computed builder scores. If realtime is enabled on the articles
 * table, the /feed page will receive an INSERT event automatically.
 *
 * Development / QA only — blocked in production unless CRON_SECRET is sent.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return Response.json({ error: "Not available in production" }, { status: 403 });
    }
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const ts  = Date.now();
  const now = new Date().toISOString();

  const title    = `[TEST] GPT-5-${ts % 100_000} — Simulated Major Model Release Test`;
  const summary  = "A simulated AI model release injected to verify the realtime feed pipeline.";
  const category = "OpenAI";
  const signal   = "High Signal";
  const riskLevel = "high";

  // Compute scores from the same logic used in real ingestion
  const breakdown = computeBuilderScore({
    title,
    summary,
    category,
    publishedAt: now,
    signal,
    relevanceScore: 20,
    intelligence: { risk_level: riskLevel },
  });

  const fakeArticle = {
    title,
    summary,
    ai_summary:
      "Major model release from OpenAI with significant capability improvements. Simulated test article — discard after verifying realtime.",
    why_it_matters:
      "New model capabilities unlock new builder possibilities. Simulated test article.",
    risk_level:              riskLevel,
    category,
    source:                  "Test Injector",
    source_type:             "release",
    link:                    `https://realtime-test.example.com/release-${ts}`,
    published_at:            now,
    signal,
    humor:                   "Another day, another model that makes our existing code look quaint.",
    read_time:               "1 min",
    relevance_score:         20,
    // Builder score components
    builder_score:           breakdown.total,
    virality_score:          breakdown.virality,
    freshness_score:         breakdown.freshness,
    build_potential_score:   breakdown.build_potential,
    content_potential_score: breakdown.content_potential,
    technical_depth_score:   breakdown.technical_depth,
    updated_at:              now,
    last_ingested_at:        now,
  };

  const { data, error } = await supabase
    .from("articles")
    .insert(fakeArticle)
    .select("id, title")
    .single();

  if (error) {
    console.error("[REALTIME TEST] Insert failed:", error.message);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const row = data as { id: string; title: string };
  return Response.json({
    ok:                      true,
    id:                      row.id,
    title:                   row.title,
    builder_score:           breakdown.total,
    virality_score:          breakdown.virality,
    freshness_score:         breakdown.freshness,
    build_potential_score:   breakdown.build_potential,
    content_potential_score: breakdown.content_potential,
  });
}
