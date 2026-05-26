import { supabase } from "./client";
import type { ScoreComponents } from "@/src/lib/recommendation/feedScoring";


// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArticleScoreRow {
  articleId:      string;
  behaviorScore:  number;
  finalScore:     number;
}

// ─── Write ────────────────────────────────────────────────────────────────────

/**
 * Bulk-upserts per-user article scores to user_article_scores.
 *
 * Designed for fire-and-forget — never throws.
 * Only persists articles with a Supabase UUID (id is required for the FK).
 */
export async function upsertArticleScores(userId: string,
  rows: ArticleScoreRow[]
): Promise<void> {
  if (rows.length === 0) return;

  const payload = rows.map((r) => ({
    user_id:        userId,
    article_id:     r.articleId,
    behavior_score: r.behaviorScore,
    final_score:    r.finalScore,
    computed_at:    new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("user_article_scores")
    .upsert(payload, { onConflict: "user_id,article_id" });

  if (error) {
    console.warn("[SCORES] upsert failed:", error.message);
  }
}

/**
 * Builds the rows array from the feed score map and article list,
 * filtering out articles without a UUID.
 */
export function buildScoreRows(
  articles: { id?: string; link: string }[],
  scoreMap: Map<string, ScoreComponents>
): ArticleScoreRow[] {
  const out: ArticleScoreRow[] = [];
  for (const article of articles) {
    if (!article.id) continue;
    const components = scoreMap.get(article.link);
    if (!components) continue;
    out.push({
      articleId:     article.id,
      behaviorScore: components.behaviorScore,
      finalScore:    components.finalScore,
    });
  }
  return out;
}
