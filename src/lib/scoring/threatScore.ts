import type { SignalLevel } from "../rss/filterNews";
import type { RiskLevel } from "../ai/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BuilderVerdict = "hot" | "rising" | "watch" | "normal";

export interface ScoreBreakdown {
  virality:          number; // 10 | 20 | 35 | 50  — in formula
  freshness:         number; // 5  | 10 | 20 | 30  — in formula
  build_potential:   number; // 5  | 10 | 15 | 20 | 25 — in formula
  content_potential: number; // 5  | 10 | 15 | 20  — in formula
  // Stored & displayed but NOT added to total
  technical_depth:   number; // 10 | 20 | 40
  relevance:         number; // raw relevanceScore (capped at 30)
  total:             number; // virality + freshness + build_potential + content_potential (max 125)
}

// ─── Virality score ───────────────────────────────────────────────────────────
// Measures how widely discussed / shared this item is likely to be.
//   trending (50) = High Signal with strong engagement or breakout category
//   notable  (35) = High Signal
//   relevant (20) = Relevant
//   low      (10) = General

export function viralityScore(
  signal: SignalLevel | string,
  riskLevel: RiskLevel | string = "low",
  category = ""
): number {
  if (signal === "High Signal" && (riskLevel === "high" || category === "Security" || category === "Research Papers")) return 50;
  if (signal === "High Signal") return 35;
  if (signal === "Relevant")    return 20;
  return 10;
}

// ─── Freshness score ──────────────────────────────────────────────────────────

export function freshnessScore(publishedAt: string): number {
  const ageH = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  if (ageH < 6)  return 30;
  if (ageH < 24) return 20;
  if (ageH < 72) return 10;
  return 5;
}

// ─── Build potential ──────────────────────────────────────────────────────────
// How actionable / buildable is the content for an AI builder?

const CATEGORY_BUILD_POTENTIAL: Record<string, number> = {
  "Coding Agents":  25,
  "MCP":            25,
  "Benchmarks":     25,
  "Research Papers": 20,
  "GitHub Repos":   20,
  "Tools":          20,
  "OpenAI":         15,
  "Anthropic":      15,
  "AI Startups":    10,
  "Security":       10,
};

export function buildPotentialScore(category: string): number {
  return CATEGORY_BUILD_POTENTIAL[category] ?? 5;
}

// ─── Content potential ────────────────────────────────────────────────────────
// Derived from keyword relevance — higher relevance score = richer content signal.

export function contentPotentialScore(relevanceScore: number): number {
  const capped = Math.min(relevanceScore, 30);
  if (capped >= 20) return 20;
  if (capped >= 12) return 15;
  if (capped >= 6)  return 10;
  return 5;
}

// ─── Technical depth (stored, not summed) ─────────────────────────────────────
// Proxy for how technical / in-depth the content is.

export function technicalDepthScore(level: RiskLevel | string): number {
  if (level === "high")   return 40;
  if (level === "medium") return 20;
  return 10;
}

// ─── Master compute ────────────────────────────────────────────────────────────

export interface ArticleInput {
  title:          string;
  summary:        string;
  category:       string;
  publishedAt:    string;
  signal:         SignalLevel | string;
  relevanceScore: number;
  intelligence:   { risk_level: RiskLevel | string };
}

export function computeBuilderScore(article: ArticleInput): ScoreBreakdown {
  const virality          = viralityScore(article.signal, article.intelligence.risk_level, article.category);
  const freshness         = freshnessScore(article.publishedAt);
  const build_potential   = buildPotentialScore(article.category);
  const content_potential = contentPotentialScore(article.relevanceScore);
  const technical_depth   = technicalDepthScore(article.intelligence.risk_level);
  const relevance         = Math.min(article.relevanceScore, 30);

  // builder_score = virality + freshness + build_potential + content_potential (max 125)
  const total = virality + freshness + build_potential + content_potential;
  return { virality, freshness, build_potential, content_potential, technical_depth, relevance, total };
}

/** @deprecated Use computeBuilderScore */
export const computeThreatScore = computeBuilderScore;

// ─── Verdict ──────────────────────────────────────────────────────────────────

export function builderVerdict(score: number): BuilderVerdict {
  if (score >= 90) return "hot";
  if (score >= 70) return "rising";
  if (score >= 40) return "watch";
  return "normal";
}

// ─── UI helpers ───────────────────────────────────────────────────────────────

export function builderScoreBadgeStyle(score: number): string {
  const v = builderVerdict(score);
  if (v === "hot")    return "border border-rose-500/60 bg-rose-500/15 text-rose-300";
  if (v === "rising") return "border border-amber-500/60 bg-amber-500/15 text-amber-300";
  if (v === "watch")  return "border border-cyan-500/60 bg-cyan-500/15 text-cyan-300";
  return "border border-zinc-700 bg-zinc-800/60 text-zinc-500";
}

/** @deprecated Use builderScoreBadgeStyle */
export const threatScoreBadgeStyle = builderScoreBadgeStyle;

export function signalTier(score: number): string {
  if (score >= 50) return "CRITICAL";
  if (score >= 35) return "HIGH";
  if (score >= 20) return "MEDIUM";
  return "LOW";
}

// ─── Recommended action ───────────────────────────────────────────────────────

export type RecommendedAction = "Build on This" | "Worth a Look" | "Keep an Eye" | "Low Signal";

export interface ActionRecommendation {
  action:     RecommendedAction;
  shortLabel: string;
  badge:      string;
  dot:        string;
  priority:   1 | 2 | 3 | 4;
}

export function getRecommendedAction(score: number): ActionRecommendation {
  if (score >= 90) return {
    action:     "Build on This",
    shortLabel: "Build on This",
    badge:      "border border-rose-500/50 bg-rose-500/10 text-rose-300",
    dot:        "bg-rose-500",
    priority:   1,
  };
  if (score > 70) return {
    action:     "Worth a Look",
    shortLabel: "Worth a Look",
    badge:      "border border-amber-500/40 bg-amber-500/10 text-amber-300",
    dot:        "bg-amber-400",
    priority:   2,
  };
  if (score > 40) return {
    action:     "Keep an Eye",
    shortLabel: "Keep an Eye",
    badge:      "border border-cyan-500/30 bg-cyan-500/8 text-cyan-400",
    dot:        "bg-cyan-500",
    priority:   3,
  };
  return {
    action:     "Low Signal",
    shortLabel: "Low Signal",
    badge:      "border border-zinc-700 bg-zinc-800/60 text-zinc-500",
    dot:        "bg-zinc-600",
    priority:   4,
  };
}

// ─── Score explanation ────────────────────────────────────────────────────────

export interface ScoreExplanation {
  headline: string;
  reasons:  string[];
  verdict:  BuilderVerdict;
}

export function generateScoreExplanation(
  breakdown: ScoreBreakdown,
  article: {
    category:     string;
    signal:       string;
    publishedAt:  string;
    intelligence: { risk_level: string };
  }
): ScoreExplanation {
  const { total, virality, freshness, build_potential, content_potential, technical_depth } = breakdown;
  const reasons: string[] = [];

  // ── Virality reasons ─────────────────────────────────────────────────────
  if (virality === 50) {
    reasons.push("Trending breakout signal — high-virality topic with strong engagement");
  } else if (virality === 35) {
    reasons.push("High-signal item — broadly discussed across monitored sources");
  } else if (virality === 20) {
    reasons.push("Moderate virality — confirmed AI / builder relevance");
  } else {
    reasons.push("Low virality signal — general article with limited spread so far");
  }

  // ── Freshness reasons ────────────────────────────────────────────────────
  if (freshness === 30) {
    reasons.push("Breaking: published within the last 6 hours — get ahead of the curve");
  } else if (freshness === 20) {
    reasons.push("Fresh drop — published within the last 24 hours");
  } else if (freshness === 10) {
    reasons.push("Recent — published within 72 hours, still timely");
  } else {
    reasons.push("Older item — may be a reference or evergreen resource");
  }

  // ── Build potential reasons ──────────────────────────────────────────────
  if (build_potential >= 25) {
    reasons.push(`${article.category} — top-tier category for builders to act on`);
  } else if (build_potential >= 20) {
    reasons.push(`${article.category} — strong build potential, worth prototyping`);
  } else if (build_potential >= 15) {
    reasons.push(`${article.category} — useful for builders tracking the AI landscape`);
  } else {
    reasons.push(`${article.category} — lower direct build potential`);
  }

  // ── Content potential reasons ────────────────────────────────────────────
  if (content_potential >= 20) {
    reasons.push("Rich keyword density — high content signal for AI topics");
  } else if (content_potential >= 15) {
    reasons.push("Good content depth — solid topic coverage");
  } else if (content_potential >= 10) {
    reasons.push("Moderate content signal — some relevant AI keywords");
  } else {
    reasons.push("Sparse content signal — limited AI-specific keyword overlap");
  }

  // ── Technical depth (informational) ─────────────────────────────────────
  if (technical_depth === 40) {
    reasons.push("Deep technical content detected — implementation-level details present");
  } else if (technical_depth === 20) {
    reasons.push("Moderate technical depth — concepts and patterns discussed");
  } else {
    reasons.push("Light technical depth — editorial or high-level overview");
  }

  const verdict = builderVerdict(total);
  let headline: string;

  if (verdict === "hot") {
    headline = "Hot — build on this now, high virality and strong potential";
  } else if (verdict === "rising") {
    headline = "Rising — worth your attention, trending in the builder space";
  } else if (verdict === "watch") {
    headline = "Watch — moderate potential, keep this in your pipeline";
  } else {
    headline = "Low signal — queue for later or skip";
  }

  return { headline, reasons, verdict };
}
