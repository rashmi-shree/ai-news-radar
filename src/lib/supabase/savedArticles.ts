import { supabase } from "./client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkspaceStatus = "saved" | "reviewed" | "investigating" | "ignored";

export interface WorkspaceEntry {
  id: string;
  articleId: string;   // UUID — matches articles.id
  status: WorkspaceStatus;
  savedAt: string;
  notes: string | null;
}

export interface ActivityEntry {
  articleId:    string;
  articleTitle: string;
  status:       WorkspaceStatus;
  updatedAt:    string;
}

const USER_ID = "local-user";

// ─── Read operations ──────────────────────────────────────────────────────────

/** Returns the current status for a single article, or null if unsaved.
 *  Uses limit(1) + updated_at DESC so duplicate rows never cause an error. */
export async function getArticleStatus(
  articleId: string
): Promise<WorkspaceStatus | null> {
  const { data, error } = await supabase
    .from("saved_articles")
    .select("status")
    .eq("user_id", USER_ID)
    .eq("article_id", articleId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1);

  if (error || !data?.length) return null;
  return (data[0] as { status: WorkspaceStatus }).status;
}

/** Returns per-status counts directly from saved_articles.
 *  Deduplicates first so each article is counted exactly once. */
export async function getStatusCounts(): Promise<Record<WorkspaceStatus, number>> {
  const zero: Record<WorkspaceStatus, number> = {
    saved: 0, investigating: 0, reviewed: 0, ignored: 0,
  };

  const { data, error } = await supabase
    .from("saved_articles")
    .select("article_id, status")
    .eq("user_id", USER_ID)
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (error || !data) return zero;

  // Deduplicate — first occurrence per article_id wins (most-recent row)
  const seen = new Set<string>();
  for (const row of data as { article_id: string; status: WorkspaceStatus }[]) {
    if (seen.has(row.article_id)) continue;
    seen.add(row.article_id);
    if (row.status in zero) zero[row.status]++;
  }

  return zero;
}

/** Returns a Map<articleId, status> for all saved articles.
 *  If duplicate rows exist (legacy data), the most-recent row wins. */
export async function getSavedStatuses(): Promise<Map<string, WorkspaceStatus>> {
  const { data, error } = await supabase
    .from("saved_articles")
    .select("article_id, status")
    .eq("user_id", USER_ID)
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (error) return new Map();

  // First occurrence per article_id is the newest (due to ORDER BY updated_at DESC)
  const map = new Map<string, WorkspaceStatus>();
  for (const row of (data as { article_id: string; status: WorkspaceStatus }[])) {
    if (!map.has(row.article_id)) {
      map.set(row.article_id, row.status);
    }
  }
  return map;
}

/**
 * Returns the last 10 analyst actions ordered by updated_at DESC.
 * Each row is the most-recent action for that article.
 * Article titles are fetched in a second query and joined in JS.
 */
export async function getRecentActivity(): Promise<ActivityEntry[]> {
  // 1. Fetch last 10 saved_articles rows (one per article after dedup)
  const { data: rows, error } = await supabase
    .from("saved_articles")
    .select("article_id, status, updated_at")
    .eq("user_id", USER_ID)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(30); // fetch extra to account for dedup

  if (error || !rows?.length) return [];

  type RawActivity = { article_id: string; status: WorkspaceStatus; updated_at: string };

  // Deduplicate — keep most-recent row per article
  const seen = new Set<string>();
  const deduped: RawActivity[] = [];
  for (const row of rows as RawActivity[]) {
    if (seen.has(row.article_id)) continue;
    seen.add(row.article_id);
    deduped.push(row);
    if (deduped.length === 10) break;
  }

  // 2. Fetch article titles for the deduped article IDs
  const articleIds = deduped.map((r) => r.article_id);
  const { data: articles } = await supabase
    .from("articles")
    .select("id, title")
    .in("id", articleIds);

  const titleMap = new Map<string, string>();
  for (const a of (articles ?? []) as { id: string; title: string }[]) {
    titleMap.set(a.id, a.title);
  }

  // 3. Join and return
  return deduped
    .filter((r) => titleMap.has(r.article_id))
    .map((r) => ({
      articleId:    r.article_id,
      articleTitle: titleMap.get(r.article_id)!,
      status:       r.status,
      updatedAt:    r.updated_at,
    }));
}

/** Returns all workspace entries (all statuses) ordered newest-first.
 *  Deduplicates by article_id — one article = one active status. */
export async function getWorkspaceEntries(): Promise<WorkspaceEntry[]> {
  const { data, error } = await supabase
    .from("saved_articles")
    .select("id, article_id, status, notes, created_at, updated_at")
    .eq("user_id", USER_ID)
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (error) return [];

  type RawRow = {
    id: string;
    article_id: string;
    status: WorkspaceStatus;
    notes: string | null;
    created_at: string;
    updated_at: string | null;
  };

  // Keep only the most-recent row per article (first occurrence after ORDER BY updated_at DESC).
  const seen = new Set<string>();
  const deduped = (data as RawRow[]).filter((row) => {
    if (seen.has(row.article_id)) return false;
    seen.add(row.article_id);
    return true;
  });

  return deduped.map((row) => ({
    id:        row.id,
    articleId: row.article_id,
    status:    row.status,
    savedAt:   row.created_at,
    notes:     row.notes ?? null,
  }));
}

/** Returns existing notes (and current status) for a single article. */
export async function getArticleNotes(
  articleId: string
): Promise<{ notes: string | null; status: WorkspaceStatus | null }> {
  const { data, error } = await supabase
    .from("saved_articles")
    .select("notes, status")
    .eq("user_id", USER_ID)
    .eq("article_id", articleId)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(1);

  if (error || !data?.length) return { notes: null, status: null };
  const row = data[0] as { notes: string | null; status: WorkspaceStatus };
  return { notes: row.notes ?? null, status: row.status };
}
