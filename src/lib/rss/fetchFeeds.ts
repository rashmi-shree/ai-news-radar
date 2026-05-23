import Parser from "rss-parser";
import { sources, type NewsSource } from "./sources";
import {
  isHardExcluded,
  inferCategory,
  scoreArticle,
  type SignalLevel,
} from "./filterNews";

export type FeedItem = {
  title: string;
  link: string;
  publishedAt: string;
  source: string;
  category: string;
  summary: string;
  signal: SignalLevel;
  /** Debug only — relevance score used for filtering and sorting. */
  relevanceScore: number;
};

const parser = new Parser({
  timeout: 10_000,
  headers: { "User-Agent": "AI-News-Radar/1.0" },
});

const LIMIT = 20;
const MIN_SCORE = 3;
const SUMMARY_MAX_CHARS = 280;

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

    items.push({
      title,
      link: item.link ?? item.guid ?? "",
      publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
      source: source.name,
      category,
      summary,
      signal,
      relevanceScore: score,
    });
  }

  return items;
}

export async function fetchAllFeeds(): Promise<FeedItem[]> {
  const results = await Promise.allSettled(sources.map(fetchFeed));

  const items: FeedItem[] = [];

  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      console.error(
        `[fetchAllFeeds] Failed to fetch "${sources[index].name}" (${sources[index].url}):`,
        result.reason
      );
      continue;
    }
    items.push(...result.value);
  }

  return items.sort(sortItems).slice(0, LIMIT);
}
