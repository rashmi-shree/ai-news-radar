import { inferCategory, scoreArticle } from "./filterNews";
import { generateFallback } from "../ai/summarize";
import type { FeedItem } from "./fetchFeeds";

// ─── GitHub Search API types ──────────────────────────────────────────────────

type GhRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  pushed_at: string;
  topics: string[];
  owner: { login: string };
};

type GhSearchResponse = {
  items: GhRepo[];
};

// ─── Config ───────────────────────────────────────────────────────────────────

const SOURCE_NAME = "GitHub Trending";
const SOURCE_ID   = "github-trending-ai";
const PER_PAGE    = 15;
const TIMEOUT_MS  = 5_000;

/**
 * Queries most recently pushed repos matching AI/LLM topics.
 * Uses GITHUB_TOKEN if set for higher rate limits (5 000 req/hr vs 60).
 */
const QUERIES = [
  "topic:llm+topic:ai-agent",
  "topic:mcp+topic:ai",
  "claude+OR+openai+topic:ai stars:>100",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildTitle(repo: GhRepo): string {
  const stars =
    repo.stargazers_count >= 1_000
      ? `★${(repo.stargazers_count / 1_000).toFixed(1)}k`
      : `★${repo.stargazers_count}`;
  const lang = repo.language ? ` · ${repo.language}` : "";
  return `${repo.full_name} [${stars}${lang}]`;
}

function buildSummary(repo: GhRepo): string {
  const desc = repo.description?.trim() ?? "No description";
  const topics = repo.topics.slice(0, 5).join(", ");
  const base = topics ? `${desc} — Topics: ${topics}` : desc;
  return base.length > 280 ? base.slice(0, 280).trimEnd() + "…" : base;
}

function dedupeByFullName(items: FeedItem[]): FeedItem[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    if (seen.has(i.link)) return false;
    seen.add(i.link);
    return true;
  });
}

// ─── Fetch one query ──────────────────────────────────────────────────────────

async function searchRepos(query: string, token?: string): Promise<GhRepo[]> {
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set("q", `${query}+pushed:>${new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)}`);
  url.searchParams.set("sort", "updated");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", String(PER_PAGE));

  const headers: Record<string, string> = {
    "User-Agent": "AI-News-Radar/1.0",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), { headers, signal: controller.signal });
    if (!res.ok) {
      if (res.status === 403) {
        console.warn("[GitHub] Rate limited — set GITHUB_TOKEN for higher limits");
      }
      return [];
    }
    const json = (await res.json()) as GhSearchResponse;
    return json.items ?? [];
  } finally {
    clearTimeout(timer);
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function fetchGitHubTrending(): Promise<FeedItem[]> {
  const token = process.env.GITHUB_TOKEN;

  // Run all queries in parallel, ignore individual failures
  const results = await Promise.allSettled(
    QUERIES.map((q) => searchRepos(q, token))
  );

  const allRepos: GhRepo[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") allRepos.push(...r.value);
  }

  const items: FeedItem[] = [];

  for (const repo of allRepos) {
    const title   = buildTitle(repo);
    const summary = buildSummary(repo);
    const link    = repo.html_url;

    const { category } = inferCategory(title, summary, "GitHub Repos");

    const { score, signal } = scoreArticle({
      title,
      summary,
      category,
      categoryMatched: true,
      sourceId: SOURCE_ID,
    });

    const intelligence = generateFallback({ title, summary, category, source: SOURCE_NAME });

    items.push({
      title,
      link,
      publishedAt: new Date(repo.pushed_at).toISOString(),
      source:      SOURCE_NAME,
      category,
      summary,
      signal,
      relevanceScore: score,
      intelligence,
      sourceType: "repo",
    });
  }

  return dedupeByFullName(items);
}
