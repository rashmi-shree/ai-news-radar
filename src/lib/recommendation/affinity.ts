import {
  getBehaviorHistory,
  type BehaviorRow,
} from "@/src/lib/supabase/userBehavior";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Normalised affinity score per category — range [0, 1].
 * Used by the workspace/analytics layer (not feed ranking — feed uses feedScoring.ts).
 */
export type AffinityMap = Map<string, number>;

export type AffinityTier = "strong" | "moderate" | "weak" | "none";

export interface AffinityResult {
  /** Normalised affinity per category (0–1). */
  map: AffinityMap;
  /** Top 3 categories by affinity, ordered highest first. */
  topCategories: { category: string; affinity: number; tier: AffinityTier }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Recency half-life — 7-day-old event counts ≈50% of a fresh one. */
const HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000;

/** Continuous weights (used for normalised affinity — analytics/workspace). */
const CONTINUOUS_WEIGHTS: Record<string, number> = {
  view:          1,
  save:          3,
  investigating: 5,
  reviewed:      2,
  ignored:       -2,
  removed:       -1,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function affinityTier(score: number): AffinityTier {
  if (score >= 0.6) return "strong";
  if (score >= 0.35) return "moderate";
  if (score > 0)    return "weak";
  return "none";
}

function decayFactor(createdAt: string): number {
  const ageMs = Date.now() - new Date(createdAt).getTime();
  return Math.exp((-ageMs * Math.LN2) / HALF_LIFE_MS);
}

// ─── Normalised affinity (analytics / workspace layer) ────────────────────────

/**
 * Computes normalised per-category affinity in [0, 1] using continuous weights
 * and recency decay. Used by the analytics dashboard and workspace.
 */
export function computeAffinityFromHistory(rows: BehaviorRow[]): AffinityResult {
  const raw = new Map<string, number>();

  for (const row of rows) {
    const weight = CONTINUOUS_WEIGHTS[row.event] ?? 0;
    const decay  = decayFactor(row.createdAt);
    raw.set(row.category, (raw.get(row.category) ?? 0) + weight * decay);
  }

  // Clamp negatives to 0
  for (const [cat, score] of raw) {
    if (score < 0) raw.set(cat, 0);
  }

  const maxScore = Math.max(...raw.values(), 1);
  const map: AffinityMap = new Map(
    [...raw.entries()].map(([cat, score]) => [cat, score / maxScore])
  );

  const topCategories = [...map.entries()]
    .filter(([, s]) => s > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([category, affinity]) => ({
      category,
      affinity: Math.round(affinity * 100) / 100,
      tier: affinityTier(affinity),
    }));

  return { map, topCategories };
}

// ─── Async loader ─────────────────────────────────────────────────────────────

/**
 * Loads behavior history and returns normalised affinity.
 * Used by the workspace / analytics layer.
 */
export async function getInterestAffinity(): Promise<AffinityResult> {
  try {
    const rows = await getBehaviorHistory(500);
    if (rows.length === 0) return { map: new Map(), topCategories: [] };

    return computeAffinityFromHistory(rows);
  } catch (err) {
    console.warn("[AFFINITY] computation failed:", err);
    return { map: new Map(), topCategories: [] };
  }
}
