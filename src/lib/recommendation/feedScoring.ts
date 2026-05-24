import { computePersonalScore, getMatchedInterestTopics } from "@/src/lib/personalization";
import type { BehaviorRow, BehaviorEvent } from "@/src/lib/supabase/userBehavior";
import type { NewsItem } from "@/components/NewsCard";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoreComponents {
  threatScore:     number;   // from article's stored threat_score
  interestScore:   number;   // from onboarding interest matching
  behaviorScore:   number;   // threshold-based behavior boost (may be negative)
  freshnessBonus:  number;   // recency bonus on top of threat_score's freshness
  finalScore:      number;   // sum — the ranking key
  /** Display labels of interests that matched this article (e.g. "AI Security"). */
  matchedTopics:   string[];
  /** Human-readable reasons for the behavior boost (e.g. "Investigated AI Security (+15)"). */
  behaviorReasons: string[];
}

/** Per-article scoring result, keyed by article.link. */
export type FeedScoreMap = Map<string, ScoreComponents>;

// ─── Behavior boost thresholds ────────────────────────────────────────────────

const THRESHOLDS: Array<{
  event:    BehaviorEvent;
  minCount: number;
  points:   number;
  reason:   (cat: string) => string;   // human-readable explanation
}> = [
  {
    event:    "view",
    minCount: 3,
    points:   +5,
    reason:   (cat) => `Viewed ${cat} articles often`,
  },
  {
    event:    "save",
    minCount: 2,
    points:   +10,
    reason:   (cat) => `Saved ${cat} articles regularly`,
  },
  {
    event:    "investigating",
    minCount: 1,
    points:   +15,
    reason:   (cat) => `Actively investigated ${cat}`,
  },
  {
    event:    "ignored",
    minCount: 2,
    points:   -10,
    reason:   (cat) => `Frequently ignored ${cat}`,
  },
];

// ─── Freshness bonus ──────────────────────────────────────────────────────────

function computeFreshnessBonus(publishedAt: string): number {
  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / 3_600_000;
  if (ageHours < 3)  return 10;
  if (ageHours < 12) return 5;
  if (ageHours < 24) return 2;
  return 0;
}

// ─── Behavior boost map ───────────────────────────────────────────────────────

interface CategoryBoost {
  boost:   number;
  reasons: string[];   // already formatted, e.g. "Investigated AI Security (+15)"
}

/**
 * Returns a per-category behavior boost with human-readable reasons.
 * Thresholds are cumulative.
 */
function computeDetailedBoostMap(rows: BehaviorRow[]): Map<string, CategoryBoost> {
  // Count events per (category, event type)
  const counts = new Map<string, Partial<Record<BehaviorEvent, number>>>();

  for (const row of rows) {
    const existing = counts.get(row.category) ?? {};
    existing[row.event] = (existing[row.event] ?? 0) + 1;
    counts.set(row.category, existing);
  }

  const boostMap = new Map<string, CategoryBoost>();

  for (const [category, eventCounts] of counts) {
    let boost = 0;
    const reasons: string[] = [];

    for (const { event, minCount, points, reason } of THRESHOLDS) {
      if ((eventCounts[event] ?? 0) >= minCount) {
        boost   += points;
        reasons.push(`${reason(category)} (${points > 0 ? "+" : ""}${points})`);
      }
    }

    boostMap.set(category, { boost, reasons });

  }

  return boostMap;
}


// ─── Per-article scoring ──────────────────────────────────────────────────────

function scoreArticle(
  article: NewsItem,
  interests: string[],
  detailedBoostMap: Map<string, CategoryBoost>
): ScoreComponents {
  const threatScore    = article.threatScore ?? 0;
  const interestScore  = computePersonalScore(article, interests);
  const catBoost       = detailedBoostMap.get(article.category) ?? { boost: 0, reasons: [] };
  const behaviorScore  = catBoost.boost;
  const freshnessBonus = computeFreshnessBonus(article.publishedAt);
  const finalScore     = threatScore + interestScore + behaviorScore + freshnessBonus;
  const matchedTopics  = getMatchedInterestTopics(article, interests);

  return {
    threatScore,
    interestScore,
    behaviorScore,
    freshnessBonus,
    finalScore,
    matchedTopics,
    behaviorReasons: catBoost.reasons,
  };
}

// ─── Feed scoring orchestrator ────────────────────────────────────────────────

export interface FeedScoringResult {
  /** Articles sorted by finalScore DESC. */
  sorted: NewsItem[];
  /** Full score breakdown per article.link. */
  scoreMap: FeedScoreMap;
}

/**
 * Scores all articles and returns them sorted by final_score DESC.
 *
 * final_score = threat_score + interest_score + behavior_score + freshness_bonus
 */
export function scoreFeed(
  articles: NewsItem[],
  interests: string[],
  behaviorRows: BehaviorRow[]
): FeedScoringResult {
  const detailedBoostMap = computeDetailedBoostMap(behaviorRows);
  const scoreMap: FeedScoreMap = new Map();

  for (const article of articles) {
    const components = scoreArticle(article, interests, detailedBoostMap);
    scoreMap.set(article.link, components);

  }

  const sorted = [...articles].sort((a, b) => {
    const scoreA = scoreMap.get(a.link)?.finalScore ?? 0;
    const scoreB = scoreMap.get(b.link)?.finalScore ?? 0;
    return scoreB - scoreA;
  });

  return { sorted, scoreMap };
}
