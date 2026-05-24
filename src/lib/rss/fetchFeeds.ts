import Parser from "rss-parser";
import { sources, type NewsSource } from "./sources";
import {
  isHardExcluded,
  inferCategory,
  scoreArticle,
  type SignalLevel,
} from "./filterNews";
import { generateFallback } from "../ai/summarize";
import type { SummaryResult } from "../ai/types";
import { fetchNvdCves } from "./fetchNvdCves";
import type { ScoreBreakdown } from "../scoring/threatScore";

export type { ScoreBreakdown };

export type FeedItem = {
  /** Supabase UUID — only present after the article has been persisted. */
  id?: string;
  title: string;
  link: string;
  publishedAt: string;
  source: string;
  category: string;
  summary: string;
  signal: SignalLevel;
  /** Debug only — relevance score used for filtering and sorting. */
  relevanceScore: number;
  intelligence: SummaryResult;
  /** Computed threat score (0–150). Persisted to DB after ingestion. */
  threatScore?: number;
  /** Breakdown of individual score components. */
  scoreBreakdown?: ScoreBreakdown;
};

const RSS_TIMEOUT_MS = 3_000;

const parser = new Parser({
  timeout: RSS_TIMEOUT_MS,
  headers: { "User-Agent": "AI-News-Radar/1.0" },
});

const LIMIT = 20;
const MIN_SCORE = 3;
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
  "Relevant": 1,
  "General": 2,
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
  // Primary: signal level (High Signal first)
  const signalDiff = SIGNAL_ORDER[a.signal] - SIGNAL_ORDER[b.signal];
  if (signalDiff !== 0) return signalDiff;

  // Secondary: relevance score (higher first)
  const scoreDiff = b.relevanceScore - a.relevanceScore;
  if (scoreDiff !== 0) return scoreDiff;

  // Tertiary: newest first
  return (
    new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export async function fetchFeed(source: NewsSource): Promise<FeedItem[]> {
  const feed = await parser.parseURL(source.url);
  const items: FeedItem[] = [];

  for (const item of feed.items) {
    const title = item.title?.trim() ?? "(No title)";

    // Hard exclusion — drop immediately
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

    // Score gate — discard low-signal articles
    if (score < MIN_SCORE) continue;

    const intelligence = generateFallback({
      title,
      summary,
      category,
      source: source.name,
    });

    items.push({
      title,
      link: item.link ?? item.guid ?? "",
      publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
      source: source.name,
      category,
      summary,
      signal,
      relevanceScore: score,
      intelligence,
    });
  }

  return items;
}

export async function fetchAllFeeds(): Promise<FeedItem[]> {
  // Run RSS sources and NVD API in parallel; each with its own timeout.
  const [rssResults, nvdResult] = await Promise.all([
    Promise.allSettled(
      sources.map((s) =>
        withTimeout(fetchFeed(s), RSS_TIMEOUT_MS, s.name)
      )
    ),
    Promise.allSettled([
      withTimeout(fetchNvdCves(), RSS_TIMEOUT_MS, "NVD API"),
    ]),
  ]);

  const items: FeedItem[] = [];

  for (const [index, result] of rssResults.entries()) {
    if (result.status === "rejected") {
      console.error(
        `[fetchAllFeeds] "${sources[index].name}" failed — continuing silently:`,
        (result.reason as Error).message
      );
      continue;
    }
    items.push(...result.value);
  }

  const nvd = nvdResult[0];
  if (nvd.status === "fulfilled") {
    items.push(...nvd.value);
  } else {
    console.error(
      "[fetchAllFeeds] NVD API failed — continuing silently:",
      (nvd.reason as Error).message
    );
  }

  return items.sort(sortItems).slice(0, LIMIT);
}
