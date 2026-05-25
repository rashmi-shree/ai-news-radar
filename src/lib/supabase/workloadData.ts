import { supabase } from "./client";

const USER_ID = "local-user";
const STALE_DAYS = 3;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InvestigationItem {
  articleId:    string;
  articleTitle: string;
  builderScore: number;
  startedAt:    string;  // updated_at of the saved_articles row (when investigating began)
  ageMs:        number;  // ms since startedAt
  ageLabel:     string;  // human-readable: "2h", "3d 4h"
  isStale:      boolean; // age > STALE_DAYS
  isCritical:   boolean; // builderScore >= 90
}

export interface WorkloadData {
  items:           InvestigationItem[];
  openCount:       number;
  criticalCount:   number;   // open + critical score
  staleCount:      number;   // open > STALE_DAYS days
  avgAgeLabel:     string;   // mean age across open investigations
  oldestItem:      InvestigationItem | null;
  needsAttention:  boolean;  // true if any stale or critical open item
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ageLabel(ms: number): string {
  const secs  = Math.floor(ms / 1000);
  const mins  = Math.floor(secs  / 60);
  const hours = Math.floor(mins  / 60);
  const days  = Math.floor(hours / 24);

  if (days  > 0)  return `${days}d ${hours % 24}h`;
  if (hours > 0)  return `${hours}h ${mins % 60}m`;
  if (mins  > 0)  return `${mins}m`;
  return "just now";
}

// ─── Query ────────────────────────────────────────────────────────────────────

export async function getWorkloadData(): Promise<WorkloadData> {
  const empty: WorkloadData = {
    items: [], openCount: 0, criticalCount: 0, staleCount: 0,
    avgAgeLabel: "—", oldestItem: null, needsAttention: false,
  };

  // 1. Fetch all investigating rows for the user
  const { data: rows, error } = await supabase
    .from("saved_articles")
    .select("article_id, updated_at")
    .eq("user_id", USER_ID)
    .eq("status", "investigating")
    .order("updated_at", { ascending: true, nullsFirst: false });

  if (error || !rows?.length) return empty;

  type Row = { article_id: string; updated_at: string };

  // Deduplicate — keep oldest row per article (ascending order, first wins)
  const seen = new Set<string>();
  const deduped: Row[] = [];
  for (const r of rows as Row[]) {
    if (seen.has(r.article_id)) continue;
    seen.add(r.article_id);
    deduped.push(r);
  }

  // 2. Fetch article titles + threat scores
  const articleIds = deduped.map((r) => r.article_id);
  const { data: articles } = await supabase
    .from("articles")
    .select("id, title, builder_score")
    .in("id", articleIds);

  const meta = new Map<string, { title: string; builder_score: number }>();
  for (const a of (articles ?? []) as { id: string; title: string; builder_score: number | null }[]) {
    meta.set(a.id, { title: a.title, builder_score: a.builder_score ?? 0 });
  }

  // 3. Build items
  const now = Date.now();
  const STALE_MS = STALE_DAYS * 24 * 60 * 60 * 1000;

  const items: InvestigationItem[] = deduped
    .filter((r) => meta.has(r.article_id))
    .map((r) => {
      const { title, builder_score } = meta.get(r.article_id)!;
      const ageMs = now - new Date(r.updated_at).getTime();
      return {
        articleId:    r.article_id,
        articleTitle: title,
        builderScore: builder_score,
        startedAt:    r.updated_at,
        ageMs,
        ageLabel:     ageLabel(ageMs),
        isStale:      ageMs > STALE_MS,
        isCritical:   builder_score >= 90,
      };
    });

  if (!items.length) return empty;

  // 4. Aggregate
  const openCount     = items.length;
  const criticalCount = items.filter((i) => i.isCritical).length;
  const staleCount    = items.filter((i) => i.isStale).length;
  const avgAgeMs      = items.reduce((s, i) => s + i.ageMs, 0) / items.length;
  const oldestItem    = items.reduce((a, b) => (a.ageMs > b.ageMs ? a : b));

  return {
    items,
    openCount,
    criticalCount,
    staleCount,
    avgAgeLabel:    ageLabel(avgAgeMs),
    oldestItem,
    needsAttention: staleCount > 0 || criticalCount > 0,
  };
}
