"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  EyeOff,
  FileText,
  FolderOpen,
  Loader2,
  SearchCode,
  Shield,
  Trash2,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import Header from "@/components/Header";
import NewsCard from "@/components/NewsCard";
import { supabase } from "@/src/lib/supabase/client";
import {
  getWorkspaceEntries,
  getRecentActivity,
  type WorkspaceStatus,
  type WorkspaceEntry,
  type ActivityEntry,
} from "@/src/lib/supabase/savedArticles";
import { getArticlesByIds } from "@/src/lib/supabase/articles";
import DashboardSection from "@/components/DashboardSection";
import AnalyticsCharts from "@/components/AnalyticsCharts";
import TrendAnalysis from "@/components/TrendAnalysis";
import HeatmapWidget from "@/components/HeatmapWidget";
import WorkloadPanel from "@/components/WorkloadPanel";
import type { FeedItem } from "@/src/lib/rss/fetchFeeds";
import type { NewsItem } from "@/components/NewsCard";
import { useCountUp } from "@/src/hooks/useCountUp";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceItem extends WorkspaceEntry {
  article: FeedItem;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const SECTION_ORDER = [
  "investigating",
  "saved",
  "reviewed",
  "ignored",
] as const satisfies WorkspaceStatus[];

const STATUS_CFG: Record<
  WorkspaceStatus,
  {
    label: string;
    Icon: React.ElementType;
    color: string;
    headerBorder: string;
    countBadge: string;
    cardAccent: string;
    summaryCard: string;
  }
> = {
  investigating: {
    label:       "Researching",
    Icon:        SearchCode,
    color:       "text-amber-400",
    headerBorder:"border-amber-500/30",
    countBadge:  "bg-amber-500/15 text-amber-300",
    cardAccent:  "border-l-amber-500/50",
    summaryCard: "border border-amber-500/20 bg-amber-500/5",
  },
  saved: {
    label:       "Watching",
    Icon:        Bookmark,
    color:       "text-cyan-400",
    headerBorder:"border-cyan-500/30",
    countBadge:  "bg-cyan-500/15 text-cyan-300",
    cardAccent:  "border-l-cyan-500/50",
    summaryCard: "border border-cyan-500/20 bg-cyan-500/5",
  },
  reviewed: {
    label:       "Built",
    Icon:        CheckCircle2,
    color:       "text-emerald-400",
    headerBorder:"border-emerald-500/30",
    countBadge:  "bg-emerald-500/15 text-emerald-300",
    cardAccent:  "border-l-emerald-500/50",
    summaryCard: "border border-emerald-500/20 bg-emerald-500/5",
  },
  ignored: {
    label:       "Ignore",
    Icon:        EyeOff,
    color:       "text-zinc-500",
    headerBorder:"border-zinc-700",
    countBadge:  "bg-zinc-800 text-zinc-500",
    cardAccent:  "border-l-zinc-700",
    summaryCard: "border border-zinc-800 bg-zinc-900/40",
  },
};

// ─── Workspace filters ────────────────────────────────────────────────────────

type FilterKey = "all" | "critical" | "high-opportunity" | "coding-agents" | "research" | "benchmarks";

interface FilterDef {
  key:     FilterKey;
  label:   string;
  match:   (item: WorkspaceItem) => boolean;
}

const FILTERS: FilterDef[] = [
  { key: "all",              label: "All",             match: () => true },
  { key: "critical",         label: "Hot",             match: (i) => (i.article.builderScore ?? 0) >= 90 },
  { key: "high-opportunity", label: "High Opportunity", match: (i) => i.article.intelligence?.risk_level === "high" },
  { key: "coding-agents",    label: "Coding Agents",   match: (i) => i.article.category === "Coding Agents" },
  { key: "research",         label: "Research Papers", match: (i) => i.article.category === "Research Papers" },
  { key: "benchmarks",       label: "Benchmarks",      match: (i) => i.article.category === "Benchmarks" },
];

function FilterBar({
  active,
  onChange,
  items,
}: {
  active:   FilterKey;
  onChange: (k: FilterKey) => void;
  items:    WorkspaceItem[];
}) {
  return (
    <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filter workspace articles">
      {FILTERS.map((f) => {
        const count  = f.key === "all" ? items.length : items.filter(f.match).length;
        const isActive = active === f.key;

        return (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            aria-pressed={isActive}
            className={clsx(
              "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              isActive
                ? f.key === "critical"
                  ? "border-red-500/50 bg-red-500/15 text-red-300 shadow-[0_0_12px_-4px_rgba(239,68,68,0.4)]"
                  : f.key === "high-opportunity"
                  ? "border-orange-500/50 bg-orange-500/15 text-orange-300"
                  : f.key === "coding-agents"
                  ? "border-violet-500/50 bg-violet-500/15 text-violet-300"
                  : f.key === "research"
                  ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                  : f.key === "benchmarks"
                  ? "border-rose-500/50 bg-rose-500/15 text-rose-300"
                  : "border-cyan-500/50 bg-cyan-500/15 text-cyan-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
            )}
          >
            {f.label}
            {count > 0 && (
              <span
                className={clsx(
                  "rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none",
                  isActive ? "bg-white/10" : "bg-zinc-800 text-zinc-500"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── API helper ───────────────────────────────────────────────────────────────

async function postAction(
  articleId: string,
  action: WorkspaceStatus | "remove"
): Promise<boolean> {
  try {
    const res = await fetch("/api/article/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, action }),
    });
    if (!res.ok) {
      console.error(`[WORKSPACE] postAction HTTP ${res.status}`);
      return false;
    }
    const body = await res.json() as { ok: boolean };
    return body.ok;
  } catch (err) {
    console.error("[WORKSPACE] postAction failed:", err);
    return false;
  }
}

// ─── Workspace action strip ───────────────────────────────────────────────────

function ActionStrip({
  item,
  onMove,
  onRemove,
}: {
  item: WorkspaceItem;
  onMove: (articleId: string, s: WorkspaceStatus) => Promise<void>;
  onRemove: (articleId: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const currentStatus = item.status;

  async function move(s: WorkspaceStatus) {
    setBusy(true);
    await onMove(item.articleId, s);
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    await onRemove(item.articleId);
    setBusy(false);
  }

  return (
    <div className="flex items-center justify-between border-t border-zinc-800/80 bg-zinc-950/60 px-4 py-2.5">
      {/* Move-to buttons */}
      <div className="flex flex-wrap gap-1.5">
        {(SECTION_ORDER as readonly WorkspaceStatus[])
          .filter((s) => s !== currentStatus)
          .map((s) => {
            const cfg = STATUS_CFG[s];
            const MoveIcon = cfg.Icon;
            return (
              <button
                key={s}
                onClick={(e) => { e.stopPropagation(); move(s); }}
                disabled={busy}
                title={`Move to ${cfg.label}`}
                className={clsx(
                  "flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] transition-colors",
                  "hover:border-zinc-500 disabled:opacity-40",
                  cfg.color
                )}
              >
                <MoveIcon size={10} />
                <span className="hidden sm:inline">{cfg.label}</span>
              </button>
            );
          })}
      </div>

      {/* Notes badge */}
      {item.notes && (
        <span className="flex items-center gap-1 rounded border border-cyan-500/20 bg-cyan-500/8 px-2 py-1 text-[10px] font-medium text-cyan-500">
          <FileText size={9} />
          Notes
        </span>
      )}

      {/* Remove */}
      <button
        onClick={(e) => { e.stopPropagation(); remove(); }}
        disabled={busy}
        title="Remove from workspace"
        className="rounded p-1 text-zinc-700 transition-colors hover:text-red-400 disabled:opacity-40"
      >
        {busy
          ? <Loader2 size={13} className="animate-spin" />
          : <Trash2 size={13} />
        }
      </button>
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  status,
  count,
}: {
  status: WorkspaceStatus;
  count: number;
}) {
  const cfg = STATUS_CFG[status];
  const Icon = cfg.Icon;

  return (
    <div
      className={clsx(
        "mb-5 flex items-center gap-3 border-b pb-3",
        cfg.headerBorder
      )}
    >
      <div className={clsx("flex items-center gap-2", cfg.color)}>
        <Icon size={15} />
        <h2 className="text-sm font-semibold tracking-wide">{cfg.label}</h2>
      </div>
      <span
        className={clsx(
          "rounded-full px-2 py-0.5 font-mono text-xs font-semibold",
          cfg.countBadge
        )}
      >
        {count}
      </span>
    </div>
  );
}

// ─── Metrics bar ──────────────────────────────────────────────────────────────

interface MetricCardProps {
  label:       string;
  sublabel:    string;
  value:       number;
  Icon:        React.ElementType;
  iconColor:   string;
  borderColor: string;
  glowColor:   string;
  textColor:   string;
  bgGradient:  string;
  featured?:   boolean;
}

function MetricCard({
  label, sublabel, value, Icon,
  iconColor, borderColor, glowColor, textColor, bgGradient, featured,
}: MetricCardProps) {
  const displayed = useCountUp(value);

  return (
    <div
      className={clsx(
        "relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 transition-all duration-300",
        borderColor, bgGradient,
        featured && glowColor
      )}
    >
      {/* Background glow blob */}
      <div
        className={clsx(
          "pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full opacity-20 blur-2xl",
          iconColor.replace("text-", "bg-")
        )}
      />

      {/* Icon */}
      <div
        className={clsx(
          "mb-4 flex h-9 w-9 items-center justify-center rounded-xl border",
          borderColor,
          featured ? "bg-zinc-800/80" : "bg-zinc-900/80"
        )}
      >
        <Icon size={17} className={iconColor} />
      </div>

      {/* Value */}
      <div>
        <p
          className={clsx(
            "font-mono text-4xl font-bold tabular-nums leading-none",
            featured ? textColor : "text-slate-100"
          )}
        >
          {displayed}
        </p>
        <p className="mt-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {label}
        </p>
        <p className="mt-0.5 text-[10px] text-zinc-600">{sublabel}</p>
      </div>
    </div>
  );
}

// ─── Critical alert banner ────────────────────────────────────────────────────

function CriticalAlertBanner({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <div
      className={clsx(
        "mb-8 flex items-center gap-4 rounded-2xl border border-red-500/30",
        "bg-gradient-to-r from-red-950/50 via-zinc-900/80 to-zinc-900/80 px-5 py-4",
        "shadow-[0_0_32px_-6px_rgba(239,68,68,0.3)]",
        "animate-pulse-slow"
      )}
      role="alert"
    >
      {/* Icon cluster */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-500/30 bg-red-950/60">
        <span className="text-lg leading-none">⚠</span>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase tracking-widest text-red-400">
          High-Signal Items Need Review
        </p>
        <p className="mt-0.5 text-sm text-slate-200">
          <span className="font-mono font-bold text-red-300">{count}</span>
          {" "}high-signal item{count !== 1 ? "s" : ""} awaiting review
          <span className="ml-2 text-xs text-zinc-500">(build score ≥ 90)</span>
        </p>
      </div>

      {/* Pulse dot */}
      <span className="shrink-0 flex h-2.5 w-2.5 items-center justify-center">
        <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-red-400 opacity-60" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
      </span>
    </div>
  );
}

function MetricsBar({
  total,
  investigating,
  reviewed,
  saved,
}: {
  total:         number;
  investigating: number;
  reviewed:      number;
  saved:         number;
}) {
  const metrics: MetricCardProps[] = [
    {
      label:       "Signals Tracked",
      sublabel:    "all statuses",
      value:       total,
      Icon:        Shield,
      iconColor:   "text-amber-400",
      borderColor: "border-amber-500/20",
      glowColor:   "shadow-[0_0_24px_-4px_rgba(245,158,11,0.25)]",
      textColor:   "text-amber-300",
      bgGradient:  "bg-gradient-to-br from-amber-950/30 via-zinc-900 to-zinc-900",
      featured:    true,
    },
    {
      label:       "Researching",
      sublabel:    "active research",
      value:       investigating,
      Icon:        SearchCode,
      iconColor:   "text-amber-400",
      borderColor: "border-amber-500/15",
      glowColor:   "shadow-[0_0_20px_-6px_rgba(245,158,11,0.2)]",
      textColor:   "text-amber-300",
      bgGradient:  "bg-gradient-to-br from-amber-950/20 via-zinc-900 to-zinc-900",
    },
    {
      label:       "Built",
      sublabel:    "completed builds",
      value:       reviewed,
      Icon:        CheckCircle2,
      iconColor:   "text-emerald-400",
      borderColor: "border-emerald-500/15",
      glowColor:   "shadow-[0_0_20px_-6px_rgba(52,211,153,0.2)]",
      textColor:   "text-emerald-300",
      bgGradient:  "bg-gradient-to-br from-emerald-950/20 via-zinc-900 to-zinc-900",
    },
    {
      label:       "Watching",
      sublabel:    "watchlist items",
      value:       saved,
      Icon:        Bookmark,
      iconColor:   "text-cyan-400",
      borderColor: "border-cyan-500/15",
      glowColor:   "shadow-[0_0_20px_-6px_rgba(34,211,238,0.2)]",
      textColor:   "text-cyan-300",
      bgGradient:  "bg-gradient-to-br from-cyan-950/20 via-zinc-900 to-zinc-900",
    },
  ];

  return (
    <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {metrics.map((m) => (
        <MetricCard key={m.label} {...m} />
      ))}
    </div>
  );
}

// ─── Activity timeline ────────────────────────────────────────────────────────

const ACTIVITY_CFG: Record<
  WorkspaceStatus,
  { label: string; Icon: React.ElementType; color: string; dot: string; bg: string }
> = {
  investigating: {
    label: "Researching",
    Icon:  SearchCode,
    color: "text-amber-400",
    dot:   "bg-amber-400",
    bg:    "bg-amber-500/10",
  },
  saved: {
    label: "Watching",
    Icon:  Bookmark,
    color: "text-cyan-400",
    dot:   "bg-cyan-400",
    bg:    "bg-cyan-500/10",
  },
  reviewed: {
    label: "Built",
    Icon:  CheckCircle2,
    color: "text-emerald-400",
    dot:   "bg-emerald-400",
    bg:    "bg-emerald-500/10",
  },
  ignored: {
    label: "Ignored",
    Icon:  EyeOff,
    color: "text-zinc-500",
    dot:   "bg-zinc-600",
    bg:    "bg-zinc-800/50",
  },
};

function timeAgo(iso: string): string {
  const ms  = Date.now() - new Date(iso).getTime();
  const s   = Math.floor(ms / 1000);
  const m   = Math.floor(s / 60);
  const h   = Math.floor(m / 60);
  const d   = Math.floor(h / 24);
  if (s < 60)  return "just now";
  if (m < 60)  return `${m}m ago`;
  if (h < 24)  return `${h}h ago`;
  if (d < 7)   return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ActivityTimeline({ entries }: { entries: ActivityEntry[] }) {
  if (entries.length === 0) return null;

  return (
    <section className="mb-12">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Recent Activity
        </h2>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
          {entries.length}
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-zinc-800" />

        <ol className="flex flex-col gap-1">
          {entries.map((entry, i) => {
            const cfg = ACTIVITY_CFG[entry.status];
            const Icon = cfg.Icon;
            return (
              <li key={`${entry.articleId}-${i}`} className="relative flex items-start gap-3">
                {/* Dot + icon */}
                <div
                  className={clsx(
                    "relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    cfg.bg
                  )}
                >
                  <Icon size={12} className={cfg.color} />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 rounded-lg border border-zinc-800/60 bg-zinc-900/60 px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span
                        className={clsx(
                          "mb-0.5 inline-block text-[10px] font-bold uppercase tracking-widest",
                          cfg.color
                        )}
                      >
                        {cfg.label}
                      </span>
                      <Link
                        href={`/article/${entry.articleId}`}
                        className="block truncate text-xs font-medium text-slate-200 hover:text-cyan-300 transition-colors"
                        title={entry.articleTitle}
                      >
                        {entry.articleTitle}
                      </Link>
                    </div>
                    <span className="shrink-0 text-[10px] text-zinc-600 tabular-nums">
                      {timeAgo(entry.updatedAt)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const [items, setItems]                   = useState<WorkspaceItem[]>([]);
  const [counts, setCounts]                 = useState<Record<WorkspaceStatus, number>>({
    saved: 0, investigating: 0, reviewed: 0, ignored: 0,
  });
  const [activity, setActivity]             = useState<ActivityEntry[]>([]);
  const [activeFilter, setActiveFilter]     = useState<FilterKey>("all");
  const [loading, setLoading]               = useState(true);
  const [realtimeConnected, setRealtimeConnected] = useState(false);

  // ── Load ──

  const loadWorkspace = useCallback(async () => {
    // Load entries and recent activity in parallel
    const [entries, recentActivity] = await Promise.all([
      getWorkspaceEntries(),
      getRecentActivity(),
    ]);

    setActivity(recentActivity);

    if (entries.length === 0) {
      setItems([]);
      setCounts({ saved: 0, investigating: 0, reviewed: 0, ignored: 0 });
      setLoading(false);
      return;
    }

    const articleMap = await getArticlesByIds(entries.map((e) => e.articleId));

    // Filter to only entries whose article still exists in the articles table.
    const merged: WorkspaceItem[] = entries
      .filter((e) => articleMap.has(e.articleId))
      .map((e) => ({ ...e, article: articleMap.get(e.articleId)! }));

    // Derive counts from joined set — orphan rows are excluded automatically.
    const reconciledCounts: Record<WorkspaceStatus, number> = {
      saved: 0, investigating: 0, reviewed: 0, ignored: 0,
    };
    for (const item of merged) {
      reconciledCounts[item.status]++;
    }

    setItems(merged);
    setCounts(reconciledCounts);
    setLoading(false);
  }, []);

  useEffect(() => { loadWorkspace(); }, [loadWorkspace]);

  // ── Realtime ──

  useEffect(() => {
    const channel = supabase
      .channel("workspace-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "saved_articles" },
        () => { loadWorkspace(); }
      )
      .subscribe((s) => {
        setRealtimeConnected(s === "SUBSCRIBED");
      });

    return () => { supabase.removeChannel(channel); };
  }, [loadWorkspace]);

  // ── Mutations — optimistic paint + confirmed reload ──

  async function handleMove(articleId: string, status: WorkspaceStatus) {
    // 1. Capture current state for rollback
    const snapshot = items;
    // 2. Paint immediately
    setItems((prev) =>
      prev.map((x) => (x.articleId === articleId ? { ...x, status } : x))
    );
    // 3. Persist
    const ok = await postAction(articleId, status);
    if (!ok) {
      // Roll back optimistic update on failure
      setItems(snapshot);
    }
    // 4. Confirm with fresh DB read so counts / sections are correct
    await loadWorkspace();
  }

  async function handleRemove(articleId: string) {
    // 1. Capture current state for rollback
    const snapshot = items;
    // 2. Remove card immediately
    setItems((prev) => prev.filter((x) => x.articleId !== articleId));
    // 3. Persist
    const ok = await postAction(articleId, "remove");
    if (!ok) {
      setItems(snapshot);
    }
    // 4. Confirm
    await loadWorkspace();
  }

  // ── Derived ──

  const total = counts.investigating + counts.saved + counts.reviewed + counts.ignored;

  // Articles with status investigating/saved AND builder score ≥ 90 (hot)
  const criticalCount = items.filter(
    (i) =>
      (i.status === "investigating" || i.status === "saved") &&
      (i.article.builderScore ?? 0) >= 90
  ).length;

  // Apply active filter — resets to "all" view when filter yields nothing
  const filterFn = FILTERS.find((f) => f.key === activeFilter)?.match ?? (() => true);
  const filteredItems = activeFilter === "all" ? items : items.filter(filterFn);

  // Groups used for rendering — filtered within each status bucket
  const grouped: Record<WorkspaceStatus, WorkspaceItem[]> = {
    investigating: filteredItems.filter((i) => i.status === "investigating"),
    saved:         filteredItems.filter((i) => i.status === "saved"),
    reviewed:      filteredItems.filter((i) => i.status === "reviewed"),
    ignored:       filteredItems.filter((i) => i.status === "ignored"),
  };

  // ── Render ──

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />

      {/* Builder accent bar */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

      <main className="animate-page-enter mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">

        {/* ── Top nav ── */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/feed"
            className="flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-slate-100"
          >
            <ArrowLeft size={14} />
            Back to feed
          </Link>

          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "h-1.5 w-1.5 rounded-full transition-colors",
                realtimeConnected ? "animate-pulse bg-emerald-400" : "bg-zinc-700"
              )}
            />
            <span className="text-xs text-zinc-600">
              {realtimeConnected ? "Live sync" : "Connecting…"}
            </span>
          </div>
        </div>

        {/* ── Page title ── */}
        <div className="mb-2 flex items-center gap-3">
          <Zap size={18} className="text-amber-400" />
          <h1 className="text-2xl font-bold text-slate-100">Builder Workspace</h1>
        </div>
        <p className="mb-8 text-sm text-zinc-500">
          Your tracked builder intelligence
          {total > 0 && (
            <span className="ml-1 font-mono text-zinc-400">· {total} article{total !== 1 ? "s" : ""}</span>
          )}
        </p>

        {/* ── Intelligence dashboard ── */}
        <DashboardSection />

        {/* ── Analytics charts ── */}
        <AnalyticsCharts />

        {/* ── Activity heatmap ── */}
        <HeatmapWidget />

        {/* ── Builder trend analysis ── */}
        <TrendAnalysis />

        {/* ── Builder workload ── */}
        <WorkloadPanel />

        {/* ── Critical alert banner ── */}
        {!loading && <CriticalAlertBanner count={criticalCount} />}

        {/* ── Metrics cards ── */}
        {loading ? (
          <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/60"
              />
            ))}
          </div>
        ) : (
          <MetricsBar
            total={total}
            investigating={counts.investigating}
            reviewed={counts.reviewed}
            saved={counts.saved}
          />
        )}

        {/* ── Empty state ── */}
        {!loading && total === 0 && (
          <div className="flex flex-col items-center justify-center gap-5 py-32 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
              <FolderOpen size={24} className="text-zinc-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-300">No articles in workspace</p>
              <p className="mt-1 text-xs text-zinc-600">
                Open any article and use Actions to watch, research, or mark it built.
              </p>
            </div>
            <Link
              href="/feed"
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-slate-100"
            >
              Go to feed →
            </Link>
          </div>
        )}

        {/* ── Recent Activity timeline ── */}
        {!loading && activity.length > 0 && (
          <ActivityTimeline entries={activity} />
        )}

        {/* ── Sections ── */}
        {!loading && total > 0 && (
          <>
            {/* Filter bar */}
            <FilterBar
              active={activeFilter}
              onChange={setActiveFilter}
              items={items}
            />

            {/* No results under active filter */}
            {filteredItems.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-20 text-center">
                <p className="text-sm font-medium text-zinc-400">
                  No articles match this filter
                </p>
                <button
                  onClick={() => setActiveFilter("all")}
                  className="text-xs text-cyan-500 hover:text-cyan-300 transition-colors"
                >
                  Clear filter →
                </button>
              </div>
            )}

          <div className="flex flex-col gap-14">
            {SECTION_ORDER.map((sectionStatus) => {
              const sectionItems = grouped[sectionStatus];
              // When a filter is active, hide sections with no matching items
              const sectionCount = activeFilter === "all"
                ? counts[sectionStatus]
                : sectionItems.length;
              if (sectionCount === 0) return null;

              return (
                <section key={sectionStatus}>
                  <SectionHeader status={sectionStatus} count={sectionCount} />

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {sectionItems.map((item) => (
                      <div
                        key={item.id}
                        className={clsx(
                          "flex flex-col overflow-hidden rounded-xl border-l-4",
                          STATUS_CFG[sectionStatus].cardAccent,
                          // dim ignored cards
                          sectionStatus === "ignored" && "opacity-60 hover:opacity-100 transition-opacity"
                        )}
                      >
                        {/* Feed-style NewsCard */}
                        <NewsCard
                          item={item.article as unknown as NewsItem}
                          workspaceStatus={item.status}
                        />

                        {/* Workspace action strip */}
                        <ActionStrip
                          item={item}
                          onMove={handleMove}
                          onRemove={handleRemove}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          </>
        )}
      </main>
    </div>
  );
}
