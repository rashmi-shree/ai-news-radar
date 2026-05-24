import { supabase } from "@/src/lib/supabase/client";
import { computeThreatScore } from "@/src/lib/scoring/threatScore";

/**
 * POST /api/realtime/test
 *
 * Inserts a synthetic "High Signal" CVE article into Supabase with
 * fully computed threat scores. If realtime is enabled on the articles
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

  const title    = `[TEST] CVE-2026-${ts % 100_000} — Simulated Critical RCE in Test Framework`;
  const summary  = "A simulated remote code execution vulnerability injected to verify the realtime feed pipeline.";
  const category = "CVEs";
  const signal   = "High Signal";
  const riskLevel = "high";

  // Compute scores from the same logic used in real ingestion
  const breakdown = computeThreatScore({
    title,
    summary,
    category,
    publishedAt: now,
    signal,
    relevanceScore: 10,
    intelligence: { risk_level: riskLevel },
  });

  const fakeArticle = {
    title,
    summary,
    ai_summary:
      "Critical RCE flaw in test framework allows unauthenticated attackers to execute arbitrary commands.",
    why_it_matters:
      "Unpatched systems running this component are directly exposed. Simulated test article — discard after verifying realtime.",
    risk_level:      riskLevel,
    category,
    source:          "Test Injector",
    link:            `https://realtime-test.example.com/cve-${ts}`,
    published_at:    now,
    signal,
    humor:           "Patch notes: 'we probably should have fixed this sooner'.",
    read_time:       "1 min",
    relevance_score: 10,
    // Threat scores — always populated
    threat_score:    breakdown.total,
    signal_score:    breakdown.signal,
    freshness_score: breakdown.freshness,
    interest_score:  breakdown.interest,
    risk_score:      breakdown.risk,
    updated_at:      now,
    last_ingested_at: now,
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
    ok:          true,
    id:          row.id,
    title:       row.title,
    threat_score: breakdown.total,
    signal_score: breakdown.signal,
    freshness_score: breakdown.freshness,
    interest_score: breakdown.interest,
  });
}
