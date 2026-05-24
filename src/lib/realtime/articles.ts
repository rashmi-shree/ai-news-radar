import { supabase } from "../supabase/client";
import type { FeedItem } from "../rss/fetchFeeds";
import type { RiskLevel } from "../ai/types";
import type { SignalLevel } from "../rss/filterNews";

// ─── Realtime status ──────────────────────────────────────────────────────────

export type RealtimeStatus = "connecting" | "connected" | "disconnected";

// ─── DB row → FeedItem conversion ────────────────────────────────────────────
// The Supabase Realtime payload carries a raw DB row (snake_case).
// Exported so the feed page can use it inline for direct state updates.

export function dbRowToFeedItem(row: Record<string, unknown>): FeedItem {
  return {
    id: row.id as string,
    title: (row.title as string) ?? "(No title)",
    link: (row.link as string) ?? "",
    publishedAt: (row.published_at as string) ?? new Date().toISOString(),
    source: (row.source as string) ?? "Unknown",
    category: (row.category as string) ?? "General",
    summary: (row.summary as string) ?? "",
    signal: ((row.signal as SignalLevel) ?? "General") as SignalLevel,
    relevanceScore: (row.relevance_score as number) ?? 0,
    intelligence: {
      ai_summary: (row.ai_summary as string) ?? "",
      why_it_matters: (row.why_it_matters as string) ?? "",
      risk_level: ((row.risk_level as RiskLevel) ?? "low") as RiskLevel,
      humor: (row.humor as string | null) ?? undefined,
      readTime: (row.read_time as string | null) ?? undefined,
    },
  };
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface ArticleCallbacks {
  onInsert?: (item: FeedItem) => void;
  onUpdate?: (item: FeedItem) => void;
  onDelete?: (item: FeedItem) => void;
  onStatusChange?: (status: RealtimeStatus) => void;
}

/**
 * Subscribes to INSERT / UPDATE / DELETE events on the `articles` table via
 * Supabase Realtime.  Returns a cleanup function — call it in useEffect cleanup.
 *
 * Prerequisites (Supabase dashboard):
 *   - Database → Replication → Enable "articles" table for realtime
 *   - Or run: ALTER TABLE articles REPLICA IDENTITY FULL;
 */
export function subscribeToArticles(callbacks: ArticleCallbacks): () => void {
  callbacks.onStatusChange?.("connecting");

  const channel = supabase
    .channel("articles-realtime")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "articles" },
      (payload) => {
        const item = dbRowToFeedItem(payload.new as Record<string, unknown>);
        callbacks.onInsert?.(item);
      }
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "articles" },
      (payload) => {
        const item = dbRowToFeedItem(payload.new as Record<string, unknown>);
        callbacks.onUpdate?.(item);
      }
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "articles" },
      (payload) => {
        const item = dbRowToFeedItem(payload.old as Record<string, unknown>);
        callbacks.onDelete?.(item);
      }
    )
    .subscribe((status, err) => {
      if (status === "SUBSCRIBED") {
        callbacks.onStatusChange?.("connected");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        if (err?.message) console.warn("[REALTIME]", status, err.message);
        callbacks.onStatusChange?.("disconnected");
      } else if (status === "CLOSED") {
        callbacks.onStatusChange?.("disconnected");
      }
    });

  return () => { supabase.removeChannel(channel); };
}
