import Parser from "rss-parser";
import { sources, inferSourceType, type NewsSource, type SourceType } from "./sources";
import {
  isHardExcluded,
  inferCategory,
  scoreArticle,
  type SignalLevel,
} from "./filterNews";
import { generateFallback } from "../ai/summarize";
import type { SummaryResult } from "../ai/types";
import { fetchGitHubTrending } from "./fetchGitHub";
import { fetchAnthropicBlog } from "./fetchAnthropicBlog";
import type { ScoreBreakdown } from "../scoring/threatScore";
import type { ResearchBrief } from "../ai/research";

export type { ScoreBreakdown };

export type FeedItem = {
  /** Supabase UUID — only present after the article has been persisted. */
  id?: string;
  title: string;
  link: string;
  publishedAt: string;
  source: string;
  category: string;
  /** Classified content type stored in articles.source_type */
  sourceType?: SourceType;
  summary: string;
  signal: SignalLevel;
  /** Raw relevance score used for filtering and sorting. */
  relevanceScore: number;
  intelligence: SummaryResult;
  /** Computed builder score (0–125). Persisted to DB after ingestion. */
  builderScore?: number;
  /** Breakdown of individual score components. */
  scoreBreakdown?: ScoreBreakdown;
  /** AI-generated research brief. Present after user triggers generation. */
  researchBrief?: ResearchBrief | null;
};

const RSS_TIMEOUT_MS = 5_000;

const parser = new Parser({
  timeout: RSS_TIMEOUT_MS,
  headers: { "User-Agent": "AI-News-Radar/1.0" },
});

/** Max articles returned from the full pipeline. */
const FEED_LIMIT = 60;
const MIN_SCORE  = 3;
const SUMMARY_MAX_CHARS = 280;

/** Races a promise against a hard timeout. */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`[timeout] ${label} exceeded ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

const SIGNAL_ORDER: Record<SignalLevel, number> = {
  "High Signal": 0,
  "Relevant":    1,
  "General":     2,
};

function truncate(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length <= SUMMARY_MAX_CHARS) return trimmed;
  return trimmed.slice(0, SUMMARY_MAX_CHARS).trimEnd() + "…";
}

function extractSummary(item: Parser.Item): string {
  const raw = item.contentSnippet ?? item.summary ?? item.content ?? "";
  return truncate(raw.replace(/(<([^>]+)>)/gi, ""));
}

function sortItems(a: FeedItem, b: FeedItem): number {
  const signalDiff = SIGNAL_ORDER[a.signal] - SIGNAL_ORDER[b.signal];
  if (signalDiff !== 0) return signalDiff;

  const scoreDiff = b.relevanceScore - a.relevanceScore;
  if (scoreDiff !== 0) return scoreDiff;

  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

// ─── RSS feed fetcher ─────────────────────────────────────────────────────────

export async function fetchFeed(source: NewsSource): Promise<FeedItem[]> {
  const feed = await parser.parseURL(source.url);
  const items: FeedItem[] = [];

  for (const item of feed.items) {
    const title = item.title?.trim() ?? "(No title)";

    if (isHardExcluded(title)) continue;

    const summary = extractSummary(item);
    const { category, matched: categoryMatched } = inferCategory(
      title,
      summary,
      source.category
    );

    const { score, signal } = scoreArticle({
      title,
      summary,
      category,
      categoryMatched,
      sourceId: source.id,
    });

    if (score < MIN_SCORE) continue;

    const intelligence = generateFallback({ title, summary, category, source: source.name });

    // Use declared source_type; if category inference gave us something more specific, respect it
    const sourceType = inferSourceType(category) !== source.source_type
      ? inferSourceType(category)
      : source.source_type;

    items.push({
      title,
      link:           item.link ?? item.guid ?? "",
      publishedAt:    item.isoDate ?? item.pubDate ?? new Date().toISOString(),
      source:         source.name,
      category,
      sourceType,
      summary,
      signal,
      relevanceScore: score,
      intelligence,
    });
  }

  return items;
}

// ─── Aggregate pipeline ───────────────────────────────────────────────────────

export async function fetchAllFeeds(): Promise<FeedItem[]> {
  // Run all sources concurrently; each with its own timeout
  const [rssResults, githubResult, anthropicResult] = await Promise.all([
    Promise.allSettled(
      sources.map((s) => withTimeout(fetchFeed(s), RSS_TIMEOUT_MS, s.name))
    ),
    Promise.allSettled([
      withTimeout(fetchGitHubTrending(), RSS_TIMEOUT_MS * 2, "GitHub Trending"),
    ]),
    Promise.allSettled([
      withTimeout(fetchAnthropicBlog(), RSS_TIMEOUT_MS * 2, "Anthropic Blog"),
    ]),
  ]);

  const items: FeedItem[] = [];

  // RSS sources
  for (const [index, result] of rssResults.entries()) {
    if (result.status === "rejected") {
      console.error(
        `[fetchAllFeeds] "${sources[index].name}" failed — continuing:`,
        (result.reason as Error).message
      );
      continue;
    }
    items.push(...result.value);
  }

  // GitHub Trending
  const gh = githubResult[0];
  if (gh.status === "fulfilled") {
    items.push(...gh.value);
  } else {
    console.error("[fetchAllFeeds] GitHub Trending failed:", (gh.reason as Error).message);
  }

  // Anthropic Blog
  const anthropic = anthropicResult[0];
  if (anthropic.status === "fulfilled") {
    items.push(...anthropic.value);
  } else {
    console.error("[fetchAllFeeds] Anthropic Blog failed:", (anthropic.reason as Error).message);
  }

  return items.sort(sortItems).slice(0, FEED_LIMIT);
}
