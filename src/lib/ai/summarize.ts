import {
  RISK_RULES,
  WHY_IT_MATTERS,
  WHY_IT_MATTERS_DEFAULT,
  HUMOR,
} from "./rules";
import type { ArticleInput, RiskLevel, SummaryResult } from "./types";

// ─── Deterministic selection helpers ─────────────────────────────────────────
// Using a simple djb2 hash so picks are stable across renders for the same title.

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(h);
}

function pickFrom<T>(arr: T[], seed: string): T {
  return arr[djb2(seed) % arr.length];
}

// ─── Risk level ───────────────────────────────────────────────────────────────

function inferRisk(title: string, summary: string): RiskLevel {
  const haystack = `${title} ${summary}`.toLowerCase();
  for (const rule of RISK_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) {
      return rule.risk;
    }
  }
  return "low";
}

// ─── TL;DR summary ───────────────────────────────────────────────────────────
// Extracts the first complete sentence from the RSS summary.
// Falls back to a title-length-trimmed excerpt if no sentence boundary is found.

function extractTldr(rawSummary: string, title: string): string {
  const clean = rawSummary.replace(/\s+/g, " ").trim();

  // Look for a sentence that ends with . ! or ? and is at least 30 chars
  const sentenceMatch = clean.match(/^.{30,}?[.!?](?:\s|$)/);
  if (sentenceMatch) {
    const sentence = sentenceMatch[0].trim();
    if (sentence.length <= 160) return sentence;
  }

  // Fallback: word-boundary truncation at 140 chars
  if (clean.length <= 140) return clean;
  const cut = clean.slice(0, 140);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut) + "…";
}

// ─── Read time ────────────────────────────────────────────────────────────────
// Estimates full article read time using the summary as a length proxy.
// Assumes the summary is ~1/6 of the full article.

function estimateReadTime(summary: string): string {
  const snippetWords = summary.trim().split(/\s+/).length;
  const estimatedArticleWords = snippetWords * 6;
  const minutes = Math.round(estimatedArticleWords / 200);

  if (minutes < 1) return "30 sec";
  if (minutes === 1) return "45 sec";
  if (minutes <= 8) return `${minutes} min`;
  return "8 min";
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function summarizeArticle(article: ArticleInput): SummaryResult {
  const { title, summary, category } = article;

  const riskLevel = inferRisk(title, summary);
  const tldr = extractTldr(summary, title);

  const templates =
    WHY_IT_MATTERS[category] ?? WHY_IT_MATTERS_DEFAULT;
  const whyItMatters = pickFrom(templates, title);

  const humorPool = HUMOR[riskLevel];
  const humor = pickFrom(humorPool, title);

  const readTime = estimateReadTime(summary);

  return {
    summary: tldr,
    whyItMatters,
    riskLevel,
    humor,
    readTime,
  };
}
