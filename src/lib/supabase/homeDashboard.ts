import { supabase } from "./client";
import type { FeedItem } from "../rss/fetchFeeds";
import type { RiskLevel } from "../ai/types";
import type { SignalLevel } from "../rss/filterNews";
import type { SourceType } from "../rss/sources";
import type { ResearchBrief } from "../ai/research";


// ─── Types ────────────────────────────────────────────────────────────────────

export interface TodayPills {
  openai:    number;
  anthropic: number;
  repos:     number;
  papers:    number;
  buildIdeas: number;
  contentOps: number;
}

export interface DashboardData {
  pills:          TodayPills;
  buildThisWeek:  FeedItem[];
  researchNext:   FeedItem[];
  createContent:  FeedItem[];
  savedItems:     FeedItem[];
}

// ─── Row → FeedItem mapper (minimal) ─────────────────────────────────────────

type ArticleRow = {
  id:                    string;
  title:                 string;
  link:                  string;
  summary:               string;
  ai_summary:            string;
  why_it_matters:        string;
  category:              string;
  source:                string;
  source_type?:          string | null;
  published_at:          string;
  signal:                string;
  risk_level:            string | null;
  humor:                 string | null;
  read_time:             string | null;
  relevance_score:       number;
  builder_score?:        number | null;
  virality_score?:       number | null;
  freshness_score?:      number | null;
  build_potential_score?:   number | null;
  content_potential_score?: number | null;
  technical_depth_score?:   number | null;
  research_brief?:       ResearchBrief | null;
};

function rowToFeedItem(r: ArticleRow): FeedItem {
  const builderTotal = r.builder_score ?? 0;
  return {
    id:            r.id,
    title:         r.title,
    link:          r.link,
    publishedAt:   r.published_at,
    source:        r.source,
    sourceType:    (r.source_type ?? undefined) as SourceType | undefined,
    category:      r.category,
    summary:       r.summary,
    signal:        r.signal as SignalLevel,
    relevanceScore: r.relevance_score ?? 0,
    builderScore:   builderTotal,
    researchBrief:  r.research_brief ?? null,
    scoreBreakdown: {
      virality:          r.virality_score          ?? 0,
      freshness:         r.freshness_score         ?? 0,
      build_potential:   r.build_potential_score   ?? 0,
      content_potential: r.content_potential_score ?? 0,
      technical_depth:   r.technical_depth_score   ?? 0,
      relevance:         r.relevance_score         ?? 0,
      total:             builderTotal,
    },
    intelligence: {
      ai_summary:     r.ai_summary     ?? r.summary,
      why_it_matters: r.why_it_matters ?? "",
      risk_level:     (r.risk_level ?? "low") as RiskLevel,
      humor:          r.humor     ?? undefined,
      readTime:       r.read_time ?? undefined,
    },
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

const COLS = `
  id, title, link, summary, ai_summary, why_it_matters, category, source,
  source_type, published_at, signal, risk_level, humor, read_time,
  relevance_score, builder_score, virality_score, freshness_score,
  build_potential_score, content_potential_score, technical_depth_score
`.trim();

const sevenDaysAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
};

const oneDayAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString();
};

// ─── Main query ───────────────────────────────────────────────────────────────

export async function getHomeDashboard(userId: string): Promise<DashboardData> {
  const week = sevenDaysAgo();
  const day  = oneDayAgo();

  const [
    todayCatsRes,
    buildIdeasRes,
    buildWeekRes,
    researchRes,
    contentRes,
    savedIdsRes,
  ] = await Promise.allSettled([

    // 1. Category counts in last 24 h
    supabase
      .from("articles")
      .select("category")
      .gte("published_at", day),

    // 2. Build ideas count
    supabase
      .from("builder_actions")
      .select("id", { count: "exact", head: true })
      .eq("type", "build"),

    // 3. Build this week — top by build_potential_score last 7 days
    supabase
      .from("articles")
      .select(COLS)
      .gte("published_at", week)
      .order("build_potential_score", { ascending: false })
      .limit(5),

    // 4. Research next — Research Papers ordered by technical_depth / builder_score
    supabase
      .from("articles")
      .select(COLS)
      .eq("category", "Research Papers")
      .order("builder_score", { ascending: false })
      .limit(5),

    // 5. Create content — top by content_potential_score last 7 days
    supabase
      .from("articles")
      .select(COLS)
      .gte("published_at", week)
      .order("content_potential_score", { ascending: false })
      .limit(5),

    // 6. Saved article IDs
    supabase
      .from("saved_articles")
      .select("article_id")
      .eq("user_id", userId)
      .eq("status", "saved")
      .order("updated_at", { ascending: false })
      .limit(10),
  ]);

  // ── Pills ─────────────────────────────────────────────────────────────────

  let openai    = 0;
  let anthropic = 0;
  let repos     = 0;
  let papers    = 0;

  if (todayCatsRes.status === "fulfilled" && todayCatsRes.value.data) {
    for (const r of todayCatsRes.value.data as { category: string }[]) {
      if (r.category === "OpenAI")           openai++;
      else if (r.category === "Anthropic")   anthropic++;
      else if (r.category === "GitHub Repos") repos++;
      else if (r.category === "Research Papers") papers++;
    }
  }

  const buildIdeas =
    buildIdeasRes.status === "fulfilled"
      ? (buildIdeasRes.value.count ?? 0)
      : 0;

  // content ops = articles from last 24h that could make great content (virality >= 15)
  let contentOps = 0;
  if (todayCatsRes.status === "fulfilled" && todayCatsRes.value.data) {
    contentOps = (todayCatsRes.value.data as { category: string }[]).length;
  }

  const pills: TodayPills = { openai, anthropic, repos, papers, buildIdeas, contentOps };

  // ── Build this week ───────────────────────────────────────────────────────

  const buildThisWeek =
    buildWeekRes.status === "fulfilled" && buildWeekRes.value.data
      ? (buildWeekRes.value.data as unknown as ArticleRow[]).map(rowToFeedItem)
      : [];

  // ── Research next ─────────────────────────────────────────────────────────

  const researchNext =
    researchRes.status === "fulfilled" && researchRes.value.data
      ? (researchRes.value.data as unknown as ArticleRow[]).map(rowToFeedItem)
      : [];

  // ── Create content ────────────────────────────────────────────────────────

  const createContent =
    contentRes.status === "fulfilled" && contentRes.value.data
      ? (contentRes.value.data as unknown as ArticleRow[]).map(rowToFeedItem)
      : [];

  // ── Saved items ───────────────────────────────────────────────────────────

  let savedItems: FeedItem[] = [];
  if (savedIdsRes.status === "fulfilled" && savedIdsRes.value.data?.length) {
    const ids = (savedIdsRes.value.data as { article_id: string }[]).map((r) => r.article_id);
    const { data } = await supabase
      .from("articles")
      .select(COLS)
      .in("id", ids);

    if (data) {
      const map = new Map((data as unknown as ArticleRow[]).map((r) => [r.id, r]));
      savedItems = ids
        .map((id) => map.get(id))
        .filter(Boolean)
        .map((r) => rowToFeedItem(r!));
    }
  }

  return { pills, buildThisWeek, researchNext, createContent, savedItems };
}
