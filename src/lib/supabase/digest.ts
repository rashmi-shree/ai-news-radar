import { supabase } from "./client";
import { getRecommendedAction } from "@/src/lib/scoring/threatScore";


// ─── Types ────────────────────────────────────────────────────────────────────

export type DigestPeriod = "Morning" | "Afternoon" | "Evening" | "Night";

export interface TopThreat {
  id:             string;
  title:          string;
  category:       string;
  source:         string;
  builderScore:   number;
  recommendation: string;
  priority:       1 | 2 | 3 | 4;
}

export interface OpenInvestigation {
  articleId:    string;
  title:        string;
  builderScore: number;
  ageLabel:     string;
  isCritical:   boolean;
  isStale:      boolean;
}

export interface RecommendedAction {
  articleId:    string;
  title:        string;
  action:       string;
  priority:     1 | 2 | 3 | 4;
  builderScore: number;
  category:     string;
}

export interface DigestData {
  generatedAt:        string;
  period:             DigestPeriod;
  summary: {
    criticalCount:      number;
    investigatingCount: number;
    savedCount:         number;
    totalTracked:       number;
  };
  topThreats:          TopThreat[];
  openInvestigations:  OpenInvestigation[];
  recommendedActions:  RecommendedAction[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPeriod(): DigestPeriod {
  const h = new Date().getHours();
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  if (h < 21) return "Evening";
  return "Night";
}

function ageLabel(ms: number): string {
  const mins  = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (days  > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins % 60}m`;
  if (mins  > 0) return `${mins}m`;
  return "just now";
}

// ─── Query ────────────────────────────────────────────────────────────────────

export async function getDigestData(userId: string): Promise<DigestData> {
  const now = Date.now();

  const [articlesResult, savedResult] = await Promise.allSettled([
    // Top articles by builder_score
    supabase
      .from("articles")
      .select("id, title, category, source, builder_score")
      .order("builder_score", { ascending: false })
      .limit(20),

    // All saved_articles for the user
    supabase
      .from("saved_articles")
      .select("article_id, status, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
  ]);

  // ── Parse articles ──
  type ARow = { id: string; title: string; category: string; source: string; builder_score: number | null };
  const articles: ARow[] =
    articlesResult.status === "fulfilled" && !articlesResult.value.error
      ? ((articlesResult.value.data ?? []) as ARow[])
      : [];

  // ── Parse saved ──
  type SRow = { article_id: string; status: string; updated_at: string };
  const allSaved: SRow[] =
    savedResult.status === "fulfilled" && !savedResult.value.error
      ? ((savedResult.value.data ?? []) as SRow[])
      : [];

  // Deduplicate saved rows — latest status per article_id
  const savedMap = new Map<string, SRow>();
  for (const row of allSaved) {
    if (!savedMap.has(row.article_id)) savedMap.set(row.article_id, row);
  }
  const saved = [...savedMap.values()];

  // ── Summary counts ──
  const investigating = saved.filter((r) => r.status === "investigating");
  const savedItems    = saved.filter((r) => r.status === "saved");

  // Get builder scores for saved articles to count hot items
  const savedIds = saved.map((r) => r.article_id);
  let criticalCount = 0;
  if (savedIds.length > 0) {
    const { data: savedArticleData } = await supabase
      .from("articles")
      .select("id, builder_score")
      .in("id", savedIds);
    const scoreMap = new Map<string, number>(
      ((savedArticleData ?? []) as { id: string; builder_score: number | null }[])
        .map((a) => [a.id, a.builder_score ?? 0])
    );
    criticalCount = saved.filter((r) =>
      ["saved", "investigating"].includes(r.status) &&
      (scoreMap.get(r.article_id) ?? 0) >= 90
    ).length;
  }

  // ── Top 5 items ──
  const topThreats: TopThreat[] = articles
    .filter((a) => (a.builder_score ?? 0) > 0)
    .slice(0, 5)
    .map((a) => {
      const score = a.builder_score ?? 0;
      const rec   = getRecommendedAction(score);
      return {
        id:             a.id,
        title:          a.title,
        category:       a.category,
        source:         a.source,
        builderScore:   score,
        recommendation: rec.action,
        priority:       rec.priority,
      };
    });

  // ── Open investigations ──
  const investIds = investigating.map((r) => r.article_id);
  let openInvestigations: OpenInvestigation[] = [];
  if (investIds.length > 0) {
    const { data: investArticles } = await supabase
      .from("articles")
      .select("id, title, builder_score")
      .in("id", investIds);

    const iMeta = new Map<string, { title: string; builder_score: number }>(
      ((investArticles ?? []) as { id: string; title: string; builder_score: number | null }[])
        .map((a) => [a.id, { title: a.title, builder_score: a.builder_score ?? 0 }])
    );

    const STALE_MS = 3 * 24 * 60 * 60 * 1000;
    openInvestigations = investigating
      .filter((r) => iMeta.has(r.article_id))
      .map((r) => {
        const meta  = iMeta.get(r.article_id)!;
        const ageMs = now - new Date(r.updated_at).getTime();
        return {
          articleId:    r.article_id,
          title:        meta.title,
          builderScore: meta.builder_score,
          ageLabel:     ageLabel(ageMs),
          isCritical:   meta.builder_score >= 90,
          isStale:      ageMs > STALE_MS,
        };
      })
      .sort((a, b) => b.builderScore - a.builderScore);
  }

  // ── Recommended actions (from top articles not yet ignored) ──
  const ignoredIds = new Set(saved.filter((r) => r.status === "ignored").map((r) => r.article_id));
  const recommendedActions: RecommendedAction[] = articles
    .filter((a) => !ignoredIds.has(a.id) && (a.builder_score ?? 0) > 0)
    .slice(0, 5)
    .map((a) => {
      const score = a.builder_score ?? 0;
      const rec   = getRecommendedAction(score);
      return {
        articleId:    a.id,
        title:        a.title,
        action:       rec.action,
        priority:     rec.priority,
        builderScore: score,
        category:     a.category,
      };
    });

  return {
    generatedAt: new Date().toISOString(),
    period:      getPeriod(),
    summary: {
      criticalCount,
      investigatingCount: investigating.length,
      savedCount:         savedItems.length,
      totalTracked:       saved.length,
    },
    topThreats,
    openInvestigations,
    recommendedActions,
  };
}
