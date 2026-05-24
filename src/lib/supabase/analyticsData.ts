import { supabase } from "./client";

const USER_ID = "local-user";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoreBucket {
  range:  string;
  count:  number;
  color:  string;
  fill:   string;   // recharts fill value
}

export interface StatusSlice {
  status: string;
  label:  string;
  count:  number;
  color:  string;
  fill:   string;
}

export interface CategoryBar {
  category: string;
  count:    number;
  fill:     string;
}

export interface AnalyticsData {
  scoreDistribution: ScoreBucket[];
  statusBreakdown:   StatusSlice[];
  categoryBreakdown: CategoryBar[];
}

export interface HeatmapData {
  categories: string[];                            // X axis — sorted by total desc
  riskLevels: ("High" | "Medium" | "Low")[];      // Y axis — fixed order
  /** grid[riskLevel][category] = count */
  grid:       Record<string, Record<string, number>>;
  maxCount:   number;                              // used to normalise colour intensity
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const [scoreRes, categoryRes, statusRes] = await Promise.allSettled([
    // All non-null threat scores
    supabase
      .from("articles")
      .select("threat_score")
      .not("threat_score", "is", null),

    // All categories
    supabase
      .from("articles")
      .select("category"),

    // All user saved_articles (for status breakdown)
    supabase
      .from("saved_articles")
      .select("article_id, status")
      .eq("user_id", USER_ID)
      .order("updated_at", { ascending: false, nullsFirst: false }),
  ]);

  // ── 1. Threat score distribution ─────────────────────────────────────────
  const buckets: Record<string, number> = { "0–30": 0, "31–60": 0, "61–90": 0, "91+": 0 };

  if (scoreRes.status === "fulfilled" && scoreRes.value.data) {
    for (const row of scoreRes.value.data as { threat_score: number }[]) {
      const s = row.threat_score;
      if (s <= 30)      buckets["0–30"]++;
      else if (s <= 60) buckets["31–60"]++;
      else if (s <= 90) buckets["61–90"]++;
      else              buckets["91+"]++;
    }
  }

  const scoreDistribution: ScoreBucket[] = [
    { range: "0–30",  count: buckets["0–30"],  color: "text-zinc-400",   fill: "#71717a" },
    { range: "31–60", count: buckets["31–60"], color: "text-amber-400",  fill: "#f59e0b" },
    { range: "61–90", count: buckets["61–90"], color: "text-orange-400", fill: "#fb923c" },
    { range: "91+",   count: buckets["91+"],   color: "text-red-400",    fill: "#f87171" },
  ];

  // ── 2. Category breakdown ─────────────────────────────────────────────────
  const catCounts: Record<string, number> = {};

  if (categoryRes.status === "fulfilled" && categoryRes.value.data) {
    for (const row of categoryRes.value.data as { category: string }[]) {
      const cat = row.category ?? "Other";
      catCounts[cat] = (catCounts[cat] ?? 0) + 1;
    }
  }

  const CAT_FILL: Record<string, string> = {
    "CVEs":                 "#fb7185", // rose-400
    "AI Security":          "#a78bfa", // violet-400
    "Threat Intelligence":  "#fbbf24", // amber-400
    "Red Team":             "#f87171", // red-400
    "Cloud Security":       "#38bdf8", // sky-400
    "Kubernetes Security":  "#34d399", // emerald-400
    "Deception Technology": "#818cf8", // indigo-400
    "SOC":                  "#94a3b8", // slate-400
  };

  const categoryBreakdown: CategoryBar[] = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([category, count]) => ({
      category,
      count,
      fill: CAT_FILL[category] ?? "#6b7280",
    }));

  // ── 3. Status breakdown ───────────────────────────────────────────────────
  const statusCounts: Record<string, number> = {
    saved: 0, investigating: 0, reviewed: 0, ignored: 0,
  };

  if (statusRes.status === "fulfilled" && statusRes.value.data) {
    const seen = new Set<string>();
    for (const row of statusRes.value.data as { article_id: string; status: string }[]) {
      if (seen.has(row.article_id)) continue;
      seen.add(row.article_id);
      if (row.status in statusCounts) statusCounts[row.status]++;
    }
  }

  const statusBreakdown: StatusSlice[] = [
    { status: "saved",         label: "Saved",         count: statusCounts.saved,         color: "text-cyan-400",    fill: "#22d3ee" },
    { status: "investigating", label: "Investigating",  count: statusCounts.investigating,  color: "text-amber-400",   fill: "#f59e0b" },
    { status: "reviewed",      label: "Reviewed",       count: statusCounts.reviewed,       color: "text-emerald-400", fill: "#34d399" },
    { status: "ignored",       label: "Ignored",        count: statusCounts.ignored,        color: "text-zinc-500",    fill: "#52525b" },
  ];

  return { scoreDistribution, statusBreakdown, categoryBreakdown };
}

// ─── Heatmap query ────────────────────────────────────────────────────────────

export async function getHeatmapData(): Promise<HeatmapData> {
  const RISK_LEVELS = ["High", "Medium", "Low"] as const;
  const empty: HeatmapData = { categories: [], riskLevels: [...RISK_LEVELS], grid: {}, maxCount: 0 };

  const { data, error } = await supabase
    .from("articles")
    .select("category, risk_level");

  if (error || !data) return empty;

  type Row = { category: string; risk_level: string | null };

  // Normalise risk_level to title-case label
  const riskLabel = (r: string | null): "High" | "Medium" | "Low" => {
    if (r === "high")   return "High";
    if (r === "medium") return "Medium";
    return "Low";
  };

  // Build grid and category totals
  const grid: Record<string, Record<string, number>> = {
    High: {}, Medium: {}, Low: {},
  };
  const catTotals: Record<string, number> = {};

  for (const row of data as Row[]) {
    const cat  = row.category?.trim() || "Other";
    const risk = riskLabel(row.risk_level);

    grid[risk][cat]  = (grid[risk][cat]  ?? 0) + 1;
    catTotals[cat]   = (catTotals[cat]   ?? 0) + 1;
  }

  // Sort categories by total desc, cap at 8
  const categories = Object.entries(catTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([cat]) => cat);

  // Compute max single-cell count for colour normalisation
  let maxCount = 1;
  for (const risk of RISK_LEVELS) {
    for (const cat of categories) {
      maxCount = Math.max(maxCount, grid[risk][cat] ?? 0);
    }
  }

  return { categories, riskLevels: [...RISK_LEVELS], grid, maxCount };
}
