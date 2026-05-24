import type { SignalLevel } from "../rss/filterNews";
import type { RiskLevel } from "../ai/types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoreBreakdown {
  signal:    number; // 10 | 20 | 35 | 50  — contributes to total
  freshness: number; // 5 | 10 | 20 | 30   — contributes to total
  interest:  number; // 5 | 15 | 20 | 25   — contributes to total
  // Stored & displayed but NOT added to total
  risk:      number; // 10 | 20 | 40
  relevance: number; // raw relevanceScore (capped at 30)
  total:     number; // signal + freshness + interest (max 105)
}

// ─── Signal score ─────────────────────────────────────────────────────────────
// Maps our 3-level signal field + risk_level to a 4-tier score.
//   critical (50) = "High Signal" article that is also high-risk or a CVE
//   high     (35) = "High Signal"
//   medium   (20) = "Relevant"
//   low      (10) = "General"

export function signalScore(
  signal: SignalLevel | string,
  riskLevel: RiskLevel | string = "low",
  category = ""
): number {
  if (signal === "High Signal" && (riskLevel === "high" || category === "CVEs")) return 50;
  if (signal === "High Signal") return 35;
  if (signal === "Relevant")    return 20;
  return 10;
}

// ─── Freshness score ──────────────────────────────────────────────────────────
// Finer-grained than before: rewards articles less than 6 hours old heavily.

export function freshnessScore(publishedAt: string): number {
  const ageMs  = Date.now() - new Date(publishedAt).getTime();
  const ageH   = ageMs / (1000 * 60 * 60);

  if (ageH < 6)  return 30;
  if (ageH < 24) return 20;
  if (ageH < 72) return 10;
  return 5;
}

// ─── Interest score ───────────────────────────────────────────────────────────
// Fixed category-based map — no per-user interest matching needed.
// Reflects which categories carry the most operational value.

const CATEGORY_INTEREST: Record<string, number> = {
  "CVEs":                25,
  "AI Security":         20,
  "Threat Intelligence": 20,
  "Red Team":            15,
};

export function interestScore(category: string): number {
  return CATEGORY_INTEREST[category] ?? 5;
}

// ─── Risk score (stored, not summed into threat_score) ────────────────────────

export function riskScore(level: RiskLevel | string): number {
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

export function computeThreatScore(article: ArticleInput): ScoreBreakdown {
  const risk      = riskScore(article.intelligence.risk_level);
  const signal    = signalScore(article.signal, article.intelligence.risk_level, article.category);
  const freshness = freshnessScore(article.publishedAt);
  const interest  = interestScore(article.category);
  const relevance = Math.min(article.relevanceScore, 30);

  // threat_score = signal + freshness + interest  (max 105)
  // risk and relevance are stored separately but don't inflate the headline score.
  const total = signal + freshness + interest;
  return { signal, freshness, interest, risk, relevance, total };
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
// Thresholds re-calibrated for max score of 105.

export function threatScoreBadgeStyle(score: number): string {
  if (score >= 90) return "border border-red-500/50 bg-red-500/10 text-red-400";
  if (score >= 60) return "border border-orange-500/50 bg-orange-500/10 text-orange-400";
  if (score >= 30) return "border border-yellow-500/50 bg-yellow-500/10 text-yellow-400";
  return "border border-zinc-700 bg-zinc-800/60 text-zinc-500";
}

export function signalTier(score: number): string {
  if (score >= 50) return "CRITICAL";
  if (score >= 35) return "HIGH";
  if (score >= 20) return "MEDIUM";
  return "LOW";
}

// ─── Recommended action ───────────────────────────────────────────────────────

export type RecommendedAction = "Investigate Now" | "Monitor" | "Review Later" | "Archive";

export interface ActionRecommendation {
  action:    RecommendedAction;
  shortLabel: string;           // compact form for badge
  badge:     string;            // Tailwind classes for the badge element
  dot:       string;            // colour of the indicator dot
  priority:  1 | 2 | 3 | 4;    // 1 = most urgent
}

export function getRecommendedAction(score: number): ActionRecommendation {
  if (score >= 90) return {
    action:     "Investigate Now",
    shortLabel: "Investigate",
    badge:      "border border-red-500/50 bg-red-500/10 text-red-300",
    dot:        "bg-red-500",
    priority:   1,
  };
  if (score > 70) return {
    action:     "Monitor",
    shortLabel: "Monitor",
    badge:      "border border-amber-500/40 bg-amber-500/10 text-amber-300",
    dot:        "bg-amber-400",
    priority:   2,
  };
  if (score > 40) return {
    action:     "Review Later",
    shortLabel: "Review Later",
    badge:      "border border-yellow-500/30 bg-yellow-500/8 text-yellow-400",
    dot:        "bg-yellow-500",
    priority:   3,
  };
  return {
    action:     "Archive",
    shortLabel: "Archive",
    badge:      "border border-zinc-700 bg-zinc-800/60 text-zinc-500",
    dot:        "bg-zinc-600",
    priority:   4,
  };
}

// ─── Score explanation generator ──────────────────────────────────────────────

export interface ScoreExplanation {
  headline: string;
  reasons:  string[];  // bullet points, most important first
  verdict:  "critical" | "high" | "medium" | "low";
}

/** Pure function — derives human-readable explanation from breakdown + article metadata. */
export function generateScoreExplanation(
  breakdown: ScoreBreakdown,
  article: {
    category:    string;
    signal:      string;
    publishedAt: string;
    intelligence: { risk_level: string };
  }
): ScoreExplanation {
  const { total, signal, freshness, interest, risk } = breakdown;
  const reasons: string[] = [];

  // ── Signal reasons ──────────────────────────────────────────────────────
  if (signal === 50) {
    reasons.push("Active exploitation signal — high-risk or CVE with elevated intelligence flag");
  } else if (signal === 35) {
    reasons.push("High intelligence signal detected across monitored sources");
  } else if (signal === 20) {
    reasons.push("Moderate relevance signal — confirmed cybersecurity topic");
  } else {
    reasons.push("General intelligence signal — low specificity to active threats");
  }

  // ── Freshness reasons ───────────────────────────────────────────────────
  if (freshness === 30) {
    reasons.push("Breaking: published within the last 6 hours — time-sensitive");
  } else if (freshness === 20) {
    reasons.push("Recent disclosure — published within the last 24 hours");
  } else if (freshness === 10) {
    reasons.push("Fresh intelligence — published within 72 hours");
  } else {
    reasons.push("Aging intelligence — published more than 3 days ago");
  }

  // ── Interest / category reasons ─────────────────────────────────────────
  if (interest === 25) {
    reasons.push("CVE / vulnerability category — highest operational priority");
  } else if (interest === 20) {
    reasons.push(`${article.category} category — strong interest overlap for analysts`);
  } else if (interest === 15) {
    reasons.push("Red Team operations category — relevant to offensive security teams");
  } else {
    reasons.push("General category — lower priority relative to CVEs and threat intel");
  }

  // ── Risk context (informational) ────────────────────────────────────────
  if (risk === 40) {
    reasons.push("AI risk classifier: HIGH — language suggests active exploitation or breach");
  } else if (risk === 20) {
    reasons.push("AI risk classifier: MEDIUM — potential impact, no active exploitation confirmed");
  } else {
    reasons.push("AI risk classifier: LOW — no active exploitation language detected");
  }

  // ── Headline and verdict ────────────────────────────────────────────────
  let verdict: ScoreExplanation["verdict"];
  let headline: string;

  if (total >= 90) {
    verdict  = "critical";
    headline = "Critical threat score — immediate analyst attention recommended";
  } else if (total >= 60) {
    verdict  = "high";
    headline = "High threat score — review within your current shift";
  } else if (total >= 30) {
    verdict  = "medium";
    headline = "Medium threat score — monitor and prioritise if relevant to your environment";
  } else {
    verdict  = "low";
    headline = "Low threat score — low operational urgency";
  }

  return { headline, reasons, verdict };
}
