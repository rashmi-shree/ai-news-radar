"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Fuse, { type IFuseOptions, type FuseResultMatch } from "fuse.js";
import {
  CheckCircle2,
  FlaskConical,
  Loader2,
  RefreshCw,
  Rss,
  Search,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import Header from "@/components/Header";
import NewsCard, { type MatchHighlights, type NewsItem } from "@/components/NewsCard";
import { getInterests } from "@/src/lib/supabase/interests";
import { TOPIC_LABELS } from "@/src/lib/personalization";
import { scoreFeed, type FeedScoreMap } from "@/src/lib/recommendation/feedScoring";
import { getBehaviorHistory } from "@/src/lib/supabase/userBehavior";
import {
  upsertArticleScores,
  buildScoreRows,
} from "@/src/lib/supabase/userArticleScores";
import type { RiskLevel } from "@/src/lib/ai/types";
import type { IngestionResult } from "@/src/lib/cron/ingest";
import { supabase } from "@/src/lib/supabase/client";
import {
  dbRowToFeedItem,
  type RealtimeStatus,
} from "@/src/lib/realtime/articles";
import {
  getSavedStatuses,
  type WorkspaceStatus,
} from "@/src/lib/supabase/savedArticles";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "loading" | "success" | "error" | "empty";
type ToastKind = "success" | "info" | "warning";
type Toast = { id: string; msg: string; kind: ToastKind };

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "anr_interests";
const RELEVANT_THRESHOLD = 2;
const DEBOUNCE_MS = 300;

const RISK_FILTERS: {
  value: RiskLevel;
  label: string;
  style: string;
  activeStyle: string;
}[] = [
  {
    value: "high",
    label: "High Opportunity",
    style: "border-zinc-700 text-zinc-400 hover:border-red-500/50 hover:text-red-400",
    activeStyle: "border-red-500/50 bg-red-500/10 text-red-400",
  },
  {
    value: "medium",
    label: "Medium",
    style: "border-zinc-700 text-zinc-400 hover:border-amber-500/50 hover:text-amber-400",
    activeStyle: "border-amber-500/50 bg-amber-500/10 text-amber-400",
  },
  {
    value: "low",
    label: "Low",
    style: "border-zinc-700 text-zinc-400 hover:border-emerald-500/50 hover:text-emerald-400",
    activeStyle: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  },
];

const CATEGORY_FILTERS = [
  "OpenAI",
  "Anthropic",
  "Coding Agents",
  "Research Papers",
  "Benchmarks",
] as const;

const FUSE_OPTIONS: IFuseOptions<NewsItem> = {
  keys: [
    { name: "title",                       weight: 0.40 },
    { name: "intelligence.ai_summary",     weight: 0.25 },
    { name: "intelligence.why_it_matters", weight: 0.20 },
    { name: "category",                    weight: 0.10 },
    { name: "intelligence.risk_level",     weight: 0.05 },
    { name: "source",                      weight: 0.05 },
    { name: "summary",                     weight: 0.10 },
  ],
  threshold: 0.4,
  minMatchCharLength: 2,
  includeScore: true,
  includeMatches: true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadInterests(): Promise<string[]> {
  try {
    const remote = await getInterests();
    if (remote.length > 0) {
      return remote;
    }
  } catch {
    // fall through to localStorage
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const local = JSON.parse(stored) as string[];
      return local;
    }
  } catch {
    // ignore
  }

  return [];
}

function getMatchRanges(
  matches: readonly FuseResultMatch[] | undefined,
  key: string
): readonly [number, number][] | undefined {
  return matches?.find((m) => m.key === key)?.indices as
    | readonly [number, number][]
    | undefined;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FeedPage() {
  // ── Core feed state ──
  const [items, setItems] = useState<NewsItem[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  /** Full score breakdown per article link — drives RELEVANT TO YOU badge + WhyThisCard. */
  const [feedScoreMap, setFeedScoreMap] = useState<FeedScoreMap>(new Map());
  const [status, setStatus] = useState<Status>("loading");

  // ── Sync state ──
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncMsg, setSyncMsg] = useState("");

  // ── Search & filter state ──
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // ── Workspace status badges ──
  const [savedStatuses, setSavedStatuses] = useState<Map<string, WorkspaceStatus>>(new Map());

  // ── Realtime state ──
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("disconnected");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [newItemLinks, setNewItemLinks] = useState<Set<string>>(new Set());
  const [testState, setTestState] = useState<"idle" | "injecting" | "done" | "error">("idle");

  // interests ref — kept in sync so the realtime callback can read the latest value
  const interestsRef = useRef<string[]>([]);
  useEffect(() => { interestsRef.current = interests; }, [interests]);

  // ── Debounce search ──
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  // ─── Toast helper ─────────────────────────────────────────────────────────

  function addToast(msg: string, kind: ToastKind = "info") {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, msg, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4_000);
  }

  // ─── Feed ranking ─────────────────────────────────────────────────────────
  //
  // final_score = builder_score + interest_score + behavior_score + freshness_bonus

  function applyFeedRanking(
    articles: NewsItem[],
    userInterests: string[],
    behaviorRows: Parameters<typeof scoreFeed>[2]
  ) {
    const { sorted, scoreMap } = scoreFeed(articles, userInterests, behaviorRows);

    setFeedScoreMap(scoreMap);
    setItems(sorted);

    // Persist behavior_score + final_score per article (fire-and-forget)
    void upsertArticleScores(buildScoreRows(articles, scoreMap));
  }

  // ─── Realtime subscription ────────────────────────────────────────────────
  // Subscribes on mount with [] deps — no conditional guards.
  // Functional updaters (prev =>) ensure no stale-closure issues.

  useEffect(() => {
    setRealtimeStatus("connecting");

    const channel = supabase
      .channel("articles-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "articles" },
        (payload) => {
          const item = dbRowToFeedItem(
            payload.new as Record<string, unknown>
          ) as NewsItem;

          setItems((prev) => {
            if (prev.some((x) => x.id === item.id)) return prev;
            return [item, ...prev];
          });

          // Score the new article with current interests so WhyThisCard works
          const { scoreMap: newMap } = scoreFeed([item], interestsRef.current, []);
          setFeedScoreMap((prev) => {
            const merged = new Map(prev);
            newMap.forEach((v, k) => merged.set(k, v));
            return merged;
          });

          // Entrance animation
          setNewItemLinks((prev) => new Set([...prev, item.link]));
          setTimeout(
            () =>
              setNewItemLinks((prev) => {
                const s = new Set(prev);
                s.delete(item.link);
                return s;
              }),
            1_200
          );

          addToast("New builder intelligence received", "success");
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "articles" },
        (payload) => {
          const item = dbRowToFeedItem(
            payload.new as Record<string, unknown>
          ) as NewsItem;
          setItems((prev) => prev.map((x) => (x.id === item.id ? item : x)));
          addToast("Article intelligence updated", "info");
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "articles" },
        (payload) => {
          const id = (payload.old as { id: string }).id;
          setItems((prev) => prev.filter((x) => x.id !== id));
          addToast("Article removed", "warning");
        }
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          setRealtimeStatus("disconnected");
        }
      });

    return () => {
      setRealtimeStatus("disconnected");
      supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Saved-articles realtime (badge refresh) ──────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel("saved-articles-badges")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "saved_articles" },
        () => {
          getSavedStatuses().then(setSavedStatuses);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Feed loader ──────────────────────────────────────────────────────────

  async function loadFeed() {
    setStatus("loading");

    try {
      const [fetchResult, userInterests, behaviorRows] = await Promise.all([
        fetch("/api/news").then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<{ ok: boolean; items: NewsItem[] }>;
        }),
        loadInterests(),
        getBehaviorHistory(500),
      ]);

      const { items: fetched } = fetchResult;

      if (!fetched?.length) {
        setStatus("empty");
        return;
      }

      setInterests(userInterests);
      applyFeedRanking(fetched, userInterests, behaviorRows);
      setStatus("success");

      // Load workspace status badges (non-blocking)
      getSavedStatuses().then(setSavedStatuses);
    } catch (err) {
      console.error("[FeedPage]", err);
      setStatus("error");
    }
  }

  useEffect(() => {
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Sync Now handler ─────────────────────────────────────────────────────

  async function handleSync() {
    if (syncStatus === "syncing") return;
    setSyncStatus("syncing");
    setSyncMsg("");

    try {
      const res = await fetch("/api/cron/trigger", { method: "POST" });
      const data = (await res.json()) as IngestionResult & { error?: string };

      if (data.ok) {
        setSyncStatus("success");
        setSyncMsg(`${data.inserted} new · ${data.updated} updated · ${data.skipped} skipped`);
        if (data.inserted > 0 || data.updated > 0) setTimeout(() => loadFeed(), 300);
      } else {
        setSyncStatus("error");
        setSyncMsg(data.error ?? "Sync failed");
      }
    } catch {
      setSyncStatus("error");
      setSyncMsg("Network error");
    }

    setTimeout(() => { setSyncStatus("idle"); setSyncMsg(""); }, 4_000);
  }

  // ─── Inject test article ──────────────────────────────────────────────────

  async function handleInjectTest() {
    if (testState === "injecting") return;
    setTestState("injecting");

    try {
      const res = await fetch("/api/realtime/test", { method: "POST" });
      const data = await res.json() as { ok: boolean; id?: number; title?: string; error?: string };
      if (data.ok) {
        setTestState("done");
        addToast(`Test article injected: id=${data.id}`, "info");
      } else {
        setTestState("error");
        addToast(`Inject failed: ${data.error}`, "warning");
      }
    } catch {
      setTestState("error");
      addToast("Inject failed: network error", "warning");
    }

    setTimeout(() => setTestState("idle"), 3_000);
  }

  // ─── Fuse instance ────────────────────────────────────────────────────────

  const fuse = useMemo(() => new Fuse(items, FUSE_OPTIONS), [items]);

  // ─── Search + filter pipeline ─────────────────────────────────────────────

  const { displayItems, matchMap } = useMemo(() => {
    const newMatchMap = new Map<string, readonly FuseResultMatch[]>();
    let results: NewsItem[];

    if (debouncedQuery.trim()) {
      const fuseResults = fuse.search(debouncedQuery);
      results = fuseResults.map((r) => {
        if (r.matches) newMatchMap.set(r.item.link, r.matches);
        return r.item;
      });
    } else {
      results = items;
    }

    if (riskFilter) {
      const before = results.length;
      results = results.filter((i) => i.intelligence.risk_level === riskFilter);
    }

    if (categoryFilter) {
      const before = results.length;
      results = results.filter((i) => i.category === categoryFilter);
    }

    return { displayItems: results, matchMap: newMatchMap };
  }, [items, debouncedQuery, riskFilter, categoryFilter, fuse]);

  // ─── Derived state ────────────────────────────────────────────────────────

  const isFiltering =
    debouncedQuery.trim() !== "" ||
    riskFilter !== null ||
    categoryFilter !== null;
  const hasNoResults =
    status === "success" && isFiltering && displayItems.length === 0;

  function clearAll() {
    setQuery("");
    setDebouncedQuery("");
    setRiskFilter(null);
    setCategoryFilter(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />

      {/* ── Global toast stack ── */}
      <div className="pointer-events-none fixed right-4 top-20 z-50 flex flex-col gap-2 sm:right-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "animate-toast-in flex items-center gap-2 rounded-lg border px-3 py-2 text-xs shadow-xl",
              t.kind === "success"
                ? "border-emerald-500/40 bg-zinc-900 text-emerald-400"
                : t.kind === "warning"
                ? "border-amber-500/40 bg-zinc-900 text-amber-400"
                : "border-cyan-500/40 bg-zinc-900 text-cyan-400"
            )}
          >
            {t.kind === "success" ? (
              <CheckCircle2 size={11} />
            ) : t.kind === "warning" ? (
              <X size={11} />
            ) : (
              <Wifi size={11} />
            )}
            {t.msg}
          </div>
        ))}
      </div>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">

        {/* ── Page header ── */}
        <div className="relative mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Your feed</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {status === "success"
                ? isFiltering
                  ? `${displayItems.length} result${displayItems.length !== 1 ? "s" : ""} · of ${items.length} total`
                  : `${items.length} items · personalized`
                : "Fetching latest intelligence…"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {status === "success" && (
              <>
                {/* ── Inject Test Article — dev only ── */}
                {process.env.NODE_ENV === "development" && (
                  <button
                    onClick={handleInjectTest}
                    disabled={testState === "injecting"}
                    title="Inject a synthetic article to test realtime (dev only)"
                    className={clsx(
                      "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                      testState === "injecting"
                        ? "cursor-not-allowed border-zinc-700 text-zinc-500"
                        : testState === "done"
                        ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400"
                        : testState === "error"
                        ? "border-red-500/40 bg-red-500/10 text-red-400"
                        : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                    )}
                  >
                    {testState === "injecting" ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <FlaskConical size={11} />
                    )}
                    {testState === "done" ? "Injected" : testState === "error" ? "Failed" : "Inject Test"}
                  </button>
                )}

                {/* ── Sync Now ── */}
                <button
                  onClick={handleSync}
                  disabled={syncStatus === "syncing"}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors",
                    syncStatus === "syncing"
                      ? "cursor-not-allowed border-cyan-500/40 bg-cyan-500/10 text-cyan-400"
                      : syncStatus === "success"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                      : syncStatus === "error"
                      ? "border-red-500/40 bg-red-500/10 text-red-400"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-slate-100"
                  )}
                >
                  {syncStatus === "syncing" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : syncStatus === "success" ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <Zap size={12} />
                  )}
                  {syncStatus === "syncing" ? "Syncing…" : syncStatus === "success" ? "Synced" : syncStatus === "error" ? "Failed" : "Sync Now"}
                </button>

                {/* ── Refresh ── */}
                <button
                  onClick={loadFeed}
                  className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-slate-100"
                >
                  <RefreshCw size={12} />
                  Refresh
                </button>
              </>
            )}

            {/* ── Live indicator ── */}
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5">
              {realtimeStatus === "connected" ? (
                <>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  <Wifi size={11} className="text-emerald-500" />
                  <span className="text-xs font-semibold text-emerald-400"><span className="hidden sm:inline">LIVE </span>CONNECTED</span>
                </>
              ) : realtimeStatus === "connecting" ? (
                <>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-yellow-400" />
                  <span className="text-xs text-yellow-400">Connecting…</span>
                </>
              ) : (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
                  <WifiOff size={11} className="text-zinc-600" />
                  <span className="text-xs text-zinc-500">Disconnected</span>
                </>
              )}
            </div>
          </div>

          {/* ── Sync result toast (inline) ── */}
          {syncMsg && (
            <div
              className={clsx(
                "absolute right-0 top-12 z-40 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs shadow-xl",
                syncStatus === "success"
                  ? "border-emerald-500/40 bg-zinc-900 text-emerald-400"
                  : "border-red-500/40 bg-zinc-900 text-red-400"
              )}
            >
              {syncStatus === "success" ? <CheckCircle2 size={12} /> : <X size={12} />}
              {syncMsg}
            </div>
          )}
        </div>

        {/* ── Your interests strip ── */}
        {status === "success" && interests.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="text-xs text-zinc-600">Your interests:</span>
            {interests.map((id) => (
              <span
                key={id}
                className="rounded-full border border-zinc-700 bg-zinc-800/60 px-2.5 py-0.5 text-xs text-zinc-300"
              >
                {TOPIC_LABELS[id] ?? id}
              </span>
            ))}
          </div>
        )}

        {/* ── Search + filters ── */}
        {status === "success" && (
          <div className="mb-6 flex flex-col gap-3">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search repos, tools, papers, launches…"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-9 pr-9 text-sm text-slate-100 placeholder-zinc-600 outline-none transition-colors focus:border-zinc-600"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-slate-100"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-600">Risk:</span>
              {RISK_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setRiskFilter(riskFilter === f.value ? null : f.value)}
                  className={clsx(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                    riskFilter === f.value ? f.activeStyle : f.style
                  )}
                >
                  {f.label}
                </button>
              ))}

              <span className="ml-2 text-xs text-zinc-600">Category:</span>
              {CATEGORY_FILTERS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                  className={clsx(
                    "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
                    categoryFilter === cat
                      ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-400"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {cat}
                </button>
              ))}

              {isFiltering && (
                <button
                  onClick={clearAll}
                  className="ml-auto flex items-center gap-1 text-xs text-zinc-500 hover:text-slate-100"
                >
                  <X size={11} />
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <Loader2 size={28} className="animate-spin text-cyan-500" />
            <p className="text-sm text-zinc-400">Loading latest intelligence…</p>
          </div>
        )}

        {/* ── Error ── */}
        {status === "error" && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
              <Rss size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-100">Failed to load feed</p>
              <p className="mt-1 text-xs text-zinc-500">Could not reach one or more sources.</p>
            </div>
            <button
              onClick={loadFeed}
              className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
            >
              <RefreshCw size={12} />
              Try again
            </button>
          </div>
        )}

        {/* ── Empty feed ── */}
        {status === "empty" && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
              <Rss size={20} className="text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-400">No news available</p>
            <p className="text-xs text-zinc-600">Check back soon or refresh.</p>
          </div>
        )}

        {/* ── No search results ── */}
        {hasNoResults && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
              <Search size={18} className="text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-400">
              No results for{" "}
              {debouncedQuery ? (
                <span className="text-slate-100">&ldquo;{debouncedQuery}&rdquo;</span>
              ) : (
                "the active filters"
              )}
            </p>
            <button
              onClick={clearAll}
              className="text-xs text-zinc-500 underline underline-offset-2 hover:text-slate-100"
            >
              Clear filters
            </button>
          </div>
        )}

        {/* ── News grid ── */}
        {status === "success" && !hasNoResults && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayItems.map((item, i) => {
              const fuseMatches: readonly FuseResultMatch[] | undefined =
                matchMap.get(item.link);
              const highlights: MatchHighlights = {
                title: getMatchRanges(fuseMatches, "title"),
                aiSummary:
                  getMatchRanges(fuseMatches, "intelligence.ai_summary") ??
                  getMatchRanges(fuseMatches, "summary"),
              };
              const isNew = newItemLinks.has(item.link);

              return (
                <div
                  key={`${item.link}-${i}`}
                  className={clsx(isNew && "animate-slide-in")}
                >
                  <NewsCard
                    item={item}
                    relevantToYou={(() => {
                      const s = feedScoreMap.get(item.link);
                      return s
                        ? s.interestScore + s.behaviorScore >= RELEVANT_THRESHOLD
                        : false;
                    })()}
                    highlights={highlights}
                    workspaceStatus={
                      item.id !== undefined
                        ? savedStatuses.get(item.id)
                        : undefined
                    }
                    scoreComponents={feedScoreMap.get(item.link)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {status === "success" && (
          <p className="mt-10 text-center text-xs text-zinc-700">
            Sources: OpenAI · Anthropic · Hacker News · GitHub · Papers with Code
          </p>
        )}
      </main>
    </div>
  );
}
