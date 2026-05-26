import { supabase } from "./client";


// ─── Types ────────────────────────────────────────────────────────────────────

export type TrendDirection = "up" | "down" | "flat";

export interface TrendMetric {
  label:       string;
  current:     number;
  previous:    number;
  change:      number;        // percentage, rounded to 1 dp (e.g. 14.3)
  direction:   TrendDirection;
  /** Semantic of an increase: "bad" = threats up, "neutral" = investigations up */
  sentiment:   "bad" | "neutral";
}

export interface PeriodTrend {
  label:   string;            // "Last 24h" | "Last 7 days" | "Last 30 days"
  hours:   number;
  metrics: {
    newThreats:     TrendMetric;
    criticalThreats: TrendMetric;
    investigations: TrendMetric;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10; // 1 dp
}

function direction(change: number): TrendDirection {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

function buildMetric(
  label: string,
  current: number,
  previous: number,
  sentiment: "bad" | "neutral"
): TrendMetric {
  const change = pctChange(current, previous);
  return { label, current, previous, change, direction: direction(change), sentiment };
}

// ─── Main query ───────────────────────────────────────────────────────────────

/**
 * Fetches two lightweight datasets (articles + saved_articles) covering the
 * last 60 days, then computes period-over-period metrics entirely in JS —
 * keeping the network round-trips to just 2 queries regardless of how many
 * periods/metrics we need.
 */
export async function getTrendData(userId: string): Promise<PeriodTrend[]> {
  const windowHours = 60 * 24; // 60-day look-back covers all three periods
  const since = hoursAgo(windowHours);

  const [articlesRes, investRes] = await Promise.allSettled([
    supabase
      .from("articles")
      .select("created_at, builder_score")
      .gte("created_at", since),

    supabase
      .from("saved_articles")
      .select("article_id, updated_at")
      .eq("user_id", userId)
      .eq("status", "investigating")
      .gte("updated_at", since),
  ]);

  type ArticleRow = { created_at: string; builder_score: number | null };
  type InvestRow  = { article_id: string; updated_at: string };

  const articles   = articlesRes.status  === "fulfilled" ? (articlesRes.value.data  as ArticleRow[] ?? []) : [];
  const investRows = investRes.status    === "fulfilled" ? (investRes.value.data    as InvestRow[]  ?? []) : [];

  // Deduplicate investigations by article_id (keep most-recent)
  const investSeen = new Set<string>();
  const investigations = investRows.filter((r) => {
    if (investSeen.has(r.article_id)) return false;
    investSeen.add(r.article_id);
    return true;
  });

  // Build a trend for each time window
  const PERIODS: { label: string; hours: number }[] = [
    { label: "Last 24h",    hours: 24 },
    { label: "Last 7 days", hours: 7 * 24 },
    { label: "Last 30 days", hours: 30 * 24 },
  ];

  return PERIODS.map(({ label, hours }) => {
    const curStart  = hoursAgo(hours);
    const prevStart = hoursAgo(hours * 2);

    // ── New threats ──────────────────────────────────────────────────────────
    const curNew  = articles.filter((a) => a.created_at >= curStart).length;
    const prevNew = articles.filter((a) => a.created_at >= prevStart && a.created_at < curStart).length;

    // ── Hot items (builder_score >= 90) ─────────────────────────────────────
    const curCrit  = articles.filter((a) => a.created_at >= curStart  && (a.builder_score ?? 0) >= 90).length;
    const prevCrit = articles.filter((a) => a.created_at >= prevStart && a.created_at < curStart && (a.builder_score ?? 0) >= 90).length;

    // ── Investigations started ───────────────────────────────────────────────
    const curInv  = investigations.filter((i) => i.updated_at >= curStart).length;
    const prevInv = investigations.filter((i) => i.updated_at >= prevStart && i.updated_at < curStart).length;

    return {
      label,
      hours,
      metrics: {
        newThreats:      buildMetric("New Items",              curNew,  prevNew,  "bad"),
        criticalThreats: buildMetric("Hot Items",              curCrit, prevCrit, "bad"),
        investigations:  buildMetric("Research Started",        curInv,  prevInv,  "neutral"),
      },
    };
  });
}
