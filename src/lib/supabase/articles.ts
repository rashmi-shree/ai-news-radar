import { supabase } from "./client";
import type { FeedItem } from "../rss/fetchFeeds";
import type { RiskLevel } from "../ai/types";
import type { SignalLevel } from "../rss/filterNews";
import type { ResearchBrief } from "../ai/research";
import { computeBuilderScore } from "../scoring/threatScore";
import { inferSourceType, type SourceType } from "../rss/sources";

// ─── DB row shape ─────────────────────────────────────────────────────────────

type DbArticle = {
  id: string;   // UUID primary key
  title: string;
  summary: string;
  ai_summary: string;
  why_it_matters: string;
  risk_level: string | null;
  category: string;
  source: string;
  source_type?: string | null;
  link: string;
  published_at: string;
  signal: string;
  humor: string | null;
  read_time: string | null;
  relevance_score: number;
  builder_score?: number | null;
  freshness_score?: number | null;
  build_potential_score?: number | null;
  content_potential_score?: number | null;
  technical_depth_score?: number | null;
  virality_score?: number | null;
  research_brief?: ResearchBrief | null;
  updated_at?: string;
  last_ingested_at?: string;
  created_at?: string;
};

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toDbRow(
  item: FeedItem,
  now = new Date().toISOString()
): Record<string, unknown> {
  // Always compute fresh scores so they are guaranteed to be persisted.
  // Re-use a pre-computed breakdown if available; otherwise derive it here.
  const breakdown = item.scoreBreakdown ?? computeBuilderScore(item);

  return {
    title:                   item.title,
    summary:                 item.summary,
    ai_summary:              item.intelligence.ai_summary,
    why_it_matters:          item.intelligence.why_it_matters,
    risk_level:              item.intelligence.risk_level,
    category:                item.category,
    source:                  item.source,
    source_type:             item.sourceType ?? inferSourceType(item.category),
    link:                    item.link,
    published_at:            item.publishedAt,
    signal:                  item.signal,
    humor:                   item.intelligence.humor ?? null,
    read_time:               item.intelligence.readTime ?? null,
    relevance_score:         item.relevanceScore,
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
}

function toFeedItem(row: DbArticle): FeedItem {
  const builderTotal = row.builder_score ?? 0;
  return {
    id:         row.id,
    title:      row.title,
    link:       row.link,
    publishedAt: row.published_at,
    source:     row.source,
    sourceType: (row.source_type ?? undefined) as SourceType | undefined,
    category:   row.category,
    summary:    row.summary,
    signal:     row.signal as SignalLevel,
    relevanceScore: row.relevance_score ?? 0,
    builderScore:   builderTotal,
    researchBrief:  row.research_brief ?? null,
    scoreBreakdown: {
      virality:          row.virality_score          ?? 0,
      freshness:         row.freshness_score         ?? 0,
      build_potential:   row.build_potential_score   ?? 0,
      content_potential: row.content_potential_score ?? 0,
      technical_depth:   row.technical_depth_score   ?? 0,
      relevance:         row.relevance_score         ?? 0,
      total:             builderTotal,
    },
    intelligence: {
      ai_summary:     row.ai_summary,
      why_it_matters: row.why_it_matters,
      risk_level:     row.risk_level as RiskLevel,
      humor:          row.humor ?? undefined,
      readTime:       row.read_time ?? undefined,
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches a set of articles by their IDs.
 * Returns a Map<id, FeedItem> for O(1) lookup by callers.
 */
export async function getArticlesByIds(
  ids: string[]
): Promise<Map<string, FeedItem>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .in("id", ids);

  if (error) {
    console.error("[DB] getArticlesByIds failed:", error.message);
    return new Map();
  }

  const map = new Map<string, FeedItem>();
  for (const row of (data as DbArticle[])) {
    map.set(row.id, toFeedItem(row));
  }
  return map;
}


/**
 * Upserts a batch of articles using `link` as the conflict key.
 * Returns a Map<link, id> so callers can attach DB-assigned IDs to in-memory items.
 *
 * Strategy: try with score columns first; if that fails (migration not yet run),
 * retry without score columns so articles still get persisted and IDs assigned.
 */
export async function saveArticles(items: FeedItem[]): Promise<Map<string, string>> {
  if (items.length === 0) return new Map();

  const now  = new Date().toISOString();
  const rows = items.map((item) => toDbRow(item, now));

  const { data, error } = await supabase
    .from("articles")
    .upsert(rows, { onConflict: "link" })
    .select("id, link");

  if (error) {
    console.error("[DB INSERT] Upsert failed:", error.message);
    // If the error is a missing-column error, the DB migration hasn't been run.
    // Log a clear message pointing the developer to the fix.
    if (error.message.includes("column") || error.code === "42703") {
      console.error(
        "[DB INSERT] Missing score columns — run migration 003_builder_score.sql"
      );
    }
    throw error;
  }

  const idMap = new Map<string, string>();
  for (const row of (data as { id: string; link: string }[])) {
    idMap.set(row.link, row.id);
  }

  return idMap;
}

/**
 * Fetches up to 20 articles ordered by builder_score → published_at.
 * Falls back to relevance_score → published_at when the score migration
 * hasn't been run yet (builder_score column doesn't exist).
 */
export async function getArticles(): Promise<FeedItem[]> {
  let { data, error } = await supabase
    .from("articles")
    .select("*")
    .order("builder_score", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(20);

  if (error) {
    console.warn("[DB] builder_score order failed, falling back:", error.message);
    ({ data, error } = await supabase
      .from("articles")
      .select("*")
      .order("relevance_score", { ascending: false })
      .order("published_at", { ascending: false })
      .limit(20));
  }

  if (error) {
    console.error("[DB] getArticles failed:", error.message);
    return [];
  }

  return (data as DbArticle[]).map(toFeedItem);
}

/**
 * Fetches a single article by its Supabase ID.
 * Returns null if not found or on error.
 */
export async function getArticleById(id: string): Promise<FeedItem | null> {
  // maybeSingle() returns null data (no error) when zero rows found,
  // unlike single() which errors on zero rows.
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(`[ARTICLE LOAD] DB error for id=${id}:`, error.message);
    return null;
  }
  if (!data) return null;

  try {
    return toFeedItem(data as DbArticle);
  } catch (err) {
    console.error(`[ARTICLE LOAD] toFeedItem failed for id=${id}:`, err);
    return null;
  }
}

/**
 * Fetches up to `limit` articles in the same category OR same risk level,
 * excluding the article with `excludeId`. Used for the related articles section.
 */
export async function getRelatedArticles(
  category: string,
  riskLevel: string,
  excludeId: string,
  limit = 3
): Promise<FeedItem[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .or(`category.eq.${category},risk_level.eq.${riskLevel}`)
    .neq("id", excludeId)
    .order("relevance_score", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[RELATED ARTICLES] Query failed:", error.message);
    return [];
  }

  return (data as DbArticle[]).map(toFeedItem);
}

/**
 * Returns the subset of the given links that already have an AI summary
 * stored in the DB. Used for cost-control — skip HF calls on known articles.
 */
export async function getLinksWithAISummary(
  links: string[]
): Promise<Set<string>> {
  if (links.length === 0) return new Set();

  const { data, error } = await supabase
    .from("articles")
    .select("link")
    .in("link", links)
    .not("ai_summary", "is", null)
    .neq("ai_summary", "");

  if (error) {
    console.error("[DB] getLinksWithAISummary failed:", error.message);
    return new Set();
  }

  return new Set((data as { link: string }[]).map((r) => r.link));
}

/**
 * Returns the subset of the given links that exist in the DB at all
 * (regardless of whether they have an AI summary).
 * Used by the ingest service to distinguish new vs existing articles.
 */
export async function getAllExistingLinks(links: string[]): Promise<Set<string>> {
  if (links.length === 0) return new Set();

  const { data, error } = await supabase
    .from("articles")
    .select("link")
    .in("link", links);

  if (error) {
    console.error("[DB] getAllExistingLinks failed:", error.message);
    return new Set();
  }

  return new Set((data as { link: string }[]).map((r) => r.link));
}

/**
 * Returns a summary of the current articles table for the status dashboard.
 */
export async function getIngestionStatus(): Promise<{
  articleCount: number;
  lastIngested: string | null;
  latestArticle: { title: string; source: string; publishedAt: string } | null;
}> {
  const [countResult, latestResult] = await Promise.all([
    supabase.from("articles").select("*", { count: "exact", head: true }),
    supabase
      .from("articles")
      .select("title, source, published_at, last_ingested_at")
      .order("last_ingested_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const articleCount = countResult.count ?? 0;
  const latest = latestResult.data as {
    title: string;
    source: string;
    published_at: string;
    last_ingested_at: string | null;
  } | null;

  return {
    articleCount,
    lastIngested: latest?.last_ingested_at ?? null,
    latestArticle: latest
      ? { title: latest.title, source: latest.source, publishedAt: latest.published_at }
      : null,
  };
}
