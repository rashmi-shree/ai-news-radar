import { InferenceClient } from "@huggingface/inference";
import {
  RISK_RULES,
  WHY_IT_MATTERS,
  WHY_IT_MATTERS_DEFAULT,
  HUMOR,
} from "./rules";
import type { ArticleInput, RiskLevel, SummaryResult } from "./types";

// ─── HuggingFace client (lazy singleton, server-side only) ───────────────────

let _hfClient: InferenceClient | null = null;

function getHfClient(): InferenceClient {
  if (!_hfClient) {
    _hfClient = new InferenceClient(process.env.HUGGINGFACE_API_KEY ?? "");
  }
  return _hfClient;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

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

function inferRisk(title: string, summary: string): RiskLevel {
  const haystack = `${title} ${summary}`.toLowerCase();
  for (const rule of RISK_RULES) {
    if (rule.keywords.some((kw) => haystack.includes(kw))) {
      return rule.risk;
    }
  }
  return "low";
}

function extractTldr(rawSummary: string): string {
  const clean = rawSummary.replace(/\s+/g, " ").trim();
  const sentenceMatch = clean.match(/^.{30,}?[.!?](?:\s|$)/);
  if (sentenceMatch) {
    const s = sentenceMatch[0].trim();
    if (s.length <= 160) return s;
  }
  if (clean.length <= 140) return clean;
  const cut = clean.slice(0, 140);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 80 ? cut.slice(0, lastSpace) : cut) + "…";
}

function firstTwoSentences(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const sentences = clean.match(/[^.!?]*[.!?]+/g);
  if (sentences && sentences.length >= 2) {
    return sentences.slice(0, 2).join(" ").trim();
  }
  return clean.length <= 200 ? clean : clean.slice(0, 200).trimEnd() + "…";
}

function estimateReadTime(summary: string): string {
  const snippetWords = summary.trim().split(/\s+/).length;
  const estimatedArticleWords = snippetWords * 6;
  const minutes = Math.round(estimatedArticleWords / 200);
  if (minutes < 1) return "30 sec";
  if (minutes === 1) return "45 sec";
  if (minutes <= 8) return `${minutes} min`;
  return "8 min";
}

// ─── Rule-based fallback (synchronous, always available) ─────────────────────
// Used inside fetchFeed for fast initial processing.

export function generateFallback(article: ArticleInput): SummaryResult {
  const { title, summary, category } = article;

  const risk_level = inferRisk(title, summary);
  const ai_summary = extractTldr(summary);
  const templates = WHY_IT_MATTERS[category] ?? WHY_IT_MATTERS_DEFAULT;
  const why_it_matters = pickFrom(templates, title);
  const humor = pickFrom(HUMOR[risk_level], title);
  const readTime = estimateReadTime(summary);

  return { ai_summary, why_it_matters, risk_level, humor, readTime };
}

// ─── HuggingFace summarization (async, used in route enrichment step) ────────
// Uses facebook/bart-large-cnn for ai_summary.
// Falls back to rule-based output on missing key or API error.

export async function summarizeArticle(
  content: string,
  category: string = "General"
): Promise<{ ai_summary: string; why_it_matters: string }> {
  const templates = WHY_IT_MATTERS[category] ?? WHY_IT_MATTERS_DEFAULT;
  const why_it_matters = pickFrom(templates, content.slice(0, 60));

  if (!process.env.HUGGINGFACE_API_KEY) {
    return { ai_summary: firstTwoSentences(content), why_it_matters };
  }

  try {
    const client = getHfClient();
    const result = await client.summarization({
      model: "facebook/bart-large-cnn",
      inputs: content.slice(0, 1_024), // BART token limit
      parameters: { max_length: 130, min_length: 30 },
    });

    return { ai_summary: result.summary_text, why_it_matters };
  } catch (err) {
    console.error("[HF SUMMARY] Model call failed, using fallback:", (err as Error).message);
    return {
      ai_summary: firstTwoSentences(content),
      why_it_matters: "Threat relevance still being analyzed.",
    };
  }
}
