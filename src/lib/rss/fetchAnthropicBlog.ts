import { inferCategory, scoreArticle } from "./filterNews";
import { generateFallback } from "../ai/summarize";
import type { FeedItem } from "./fetchFeeds";

// ─── Config ───────────────────────────────────────────────────────────────────

const SOURCE_NAME = "Anthropic Blog";
const SOURCE_ID   = "anthropic-blog";
const BLOG_URL    = "https://www.anthropic.com/news";
const TIMEOUT_MS  = 8_000;

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnthropicPost {
  title: string;
  slug:  string;
  date:  string;
  excerpt?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Anthropic's news page is a Next.js app that embeds page data in
 * <script id="__NEXT_DATA__">. We extract and parse that JSON blob.
 */
function extractNextData(html: string): AnthropicPost[] {
  const match = html.match(/<script\s+id="__NEXT_DATA__"\s+type="application\/json">([\s\S]*?)<\/script>/);
  if (!match?.[1]) return [];

  try {
    const json = JSON.parse(match[1]) as Record<string, unknown>;
    // Walk the Next.js pageProps structure — path varies by build
    const pageProps =
      (json?.props as Record<string, unknown>)?.pageProps as Record<string, unknown> | undefined;

    // Try common paths where news items live
    const candidates: unknown[] = [
      (pageProps?.posts as unknown[]),
      (pageProps?.items as unknown[]),
      ((pageProps?.page as Record<string, unknown>)?.posts as unknown[]),
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate) && candidate.length > 0) {
        return (candidate as Record<string, unknown>[]).map((p) => ({
          title:   String(p.title ?? p.name ?? ""),
          slug:    String(p.slug ?? p.url ?? ""),
          date:    String(p.date ?? p.publishedAt ?? p.created_at ?? new Date().toISOString()),
          excerpt: p.excerpt ? String(p.excerpt) : undefined,
        })).filter((p) => p.title && p.slug);
      }
    }
  } catch {
    // JSON parse failure — fall through to link extraction
  }

  return [];
}

/**
 * Fallback: extract article links and titles from <a> tags matching the
 * /news/<slug> pattern that Anthropic uses for individual posts.
 */
function extractFromLinks(html: string): AnthropicPost[] {
  const posts: AnthropicPost[] = [];
  const seen = new Set<string>();

  // Match <a href="/news/..."> ... <title or heading text> ... </a>
  const linkRe = /href="(\/news\/[a-z0-9-]+)"[^>]*>[\s\S]{0,400}?<\/a>/gi;
  let m: RegExpExecArray | null;

  while ((m = linkRe.exec(html)) !== null) {
    const slug = m[1];
    if (seen.has(slug) || slug === "/news") continue;
    seen.add(slug);

    // Try to extract a title from the surrounding markup
    const snippet = m[0];
    const titleMatch =
      snippet.match(/<h[1-6][^>]*>\s*(.*?)\s*<\/h[1-6]>/i) ??
      snippet.match(/aria-label="([^"]+)"/i) ??
      snippet.match(/>([^<]{10,120})</);

    const title = titleMatch?.[1]
      ?.replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!title) continue;

    posts.push({ title, slug, date: new Date().toISOString() });
  }

  return posts;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function fetchAnthropicBlog(): Promise<FeedItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let html: string;

  try {
    const res = await fetch(BLOG_URL, {
      signal:  controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AI-News-Radar/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      console.warn(`[Anthropic] Blog fetch returned HTTP ${res.status}`);
      return [];
    }

    html = await res.text();
  } catch (err) {
    console.warn("[Anthropic] Blog fetch failed:", (err as Error).message);
    return [];
  } finally {
    clearTimeout(timer);
  }

  // Try structured Next.js data first, fall back to link extraction
  let posts = extractNextData(html);
  if (posts.length === 0) posts = extractFromLinks(html);

  const items: FeedItem[] = [];

  for (const post of posts.slice(0, 15)) {
    const link = post.slug.startsWith("http")
      ? post.slug
      : `https://www.anthropic.com${post.slug}`;

    const summary = post.excerpt ?? post.title;
    const { category } = inferCategory(post.title, summary, "Anthropic");

    const { score, signal } = scoreArticle({
      title:           post.title,
      summary,
      category,
      categoryMatched: true,
      sourceId:        SOURCE_ID,
    });

    const intelligence = generateFallback({
      title:    post.title,
      summary,
      category,
      source:   SOURCE_NAME,
    });

    items.push({
      title:          post.title,
      link,
      publishedAt:    new Date(post.date).toISOString(),
      source:         SOURCE_NAME,
      category,
      summary,
      signal,
      relevanceScore: score,
      intelligence,
      sourceType:     "release",
    });
  }

  return items;
}
