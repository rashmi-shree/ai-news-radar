import { supabase } from "./client";

const USER_ID = "local-user";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalThreats:       number;   // all articles ingested
  criticalThreats:    number;   // articles with builder_score >= 90 (hot)
  avgThreatScore:     number;   // mean builder_score across all scored articles
  openInvestigations: number;   // user saved_articles where status = investigating (deduped)
  reviewedToday:      number;   // user saved_articles where status = reviewed AND updated_at = today (deduped)
  savedItems:         number;   // user saved_articles where status = saved (deduped)
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getDashboardStats(): Promise<DashboardStats> {
  const zero: DashboardStats = {
    totalThreats: 0, criticalThreats: 0, avgThreatScore: 0,
    openInvestigations: 0, reviewedToday: 0, savedItems: 0,
  };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  // Run all queries in parallel
  const [totalRes, criticalRes, scoresRes, userRowsRes] = await Promise.allSettled([
    // 1. Total articles
    supabase
      .from("articles")
      .select("id", { count: "exact", head: true }),

    // 2. Hot articles (builder_score >= 90)
    supabase
      .from("articles")
      .select("id", { count: "exact", head: true })
      .gte("builder_score", 90),

    // 3. All builder scores for average calculation
    supabase
      .from("articles")
      .select("builder_score")
      .not("builder_score", "is", null)
      .gt("builder_score", 0),

    // 4. User's saved_articles for per-status counts
    supabase
      .from("saved_articles")
      .select("article_id, status, updated_at")
      .eq("user_id", USER_ID)
      .order("updated_at", { ascending: false, nullsFirst: false }),
  ]);

  // ── 1. Total threats ──────────────────────────────────────────────────────
  const totalThreats =
    totalRes.status === "fulfilled" ? (totalRes.value.count ?? 0) : 0;

  // ── 2. Critical threats ───────────────────────────────────────────────────
  const criticalThreats =
    criticalRes.status === "fulfilled" ? (criticalRes.value.count ?? 0) : 0;

  // ── 3. Average threat score ───────────────────────────────────────────────
  let avgThreatScore = 0;
  if (scoresRes.status === "fulfilled" && scoresRes.value.data?.length) {
    const scores = (scoresRes.value.data as { builder_score: number }[]).map(
      (r) => r.builder_score
    );
    avgThreatScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  // ── 4. User per-status counts (deduplicated) ──────────────────────────────
  let openInvestigations = 0;
  let reviewedToday      = 0;
  let savedItems         = 0;

  if (userRowsRes.status === "fulfilled" && userRowsRes.value.data) {
    type Row = { article_id: string; status: string; updated_at: string | null };
    const rows = userRowsRes.value.data as Row[];

    // Deduplicate: keep most-recent row per article_id
    const seen = new Set<string>();
    for (const row of rows) {
      if (seen.has(row.article_id)) continue;
      seen.add(row.article_id);

      if (row.status === "investigating") openInvestigations++;
      if (row.status === "saved") savedItems++;
      if (row.status === "reviewed" && row.updated_at && row.updated_at >= todayIso) {
        reviewedToday++;
      }
    }
  }

  return { totalThreats, criticalThreats, avgThreatScore, openInvestigations, reviewedToday, savedItems };
}
