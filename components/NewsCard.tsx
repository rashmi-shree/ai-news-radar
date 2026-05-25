"use client";

import { ExternalLink, Clock, Lightbulb, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import type { SignalLevel } from "@/src/lib/rss/filterNews";
import type { SummaryResult, RiskLevel } from "@/src/lib/ai/types";
import type { WorkspaceStatus } from "@/src/lib/supabase/savedArticles";
import {
  builderScoreBadgeStyle,
  getRecommendedAction,
  type ScoreBreakdown,
} from "@/src/lib/scoring/threatScore";
import WhyThisCard from "@/components/WhyThisCard";
import WhySeeingPanel from "@/components/WhySeeingPanel";
import type { ScoreComponents } from "@/src/lib/recommendation/feedScoring";

export interface NewsItem {
  /** Supabase UUID — present after the article is persisted to the DB. */
  id?: string;
  title: string;
  link: string;
  publishedAt: string;
  source: string;
  category: string;
  summary: string;
  signal: SignalLevel;
  /** Debug — relevance score from scoring pipeline. */
  relevanceScore: number;
  intelligence: SummaryResult;
  /** Computed builder score (0–125). */
  builderScore?: number;
  /** Breakdown of individual score components. */
  scoreBreakdown?: ScoreBreakdown;
}

/** Per-field match index ranges from Fuse.js (inclusive [start, end] pairs). */
export interface MatchHighlights {
  title?: readonly [number, number][];
  aiSummary?: readonly [number, number][];
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const categoryStyles: Record<string, string> = {
  "OpenAI":          "bg-emerald-950/60 text-emerald-300",
  "Anthropic":       "bg-orange-950/60 text-orange-300",
  "Coding Agents":   "bg-violet-950/60 text-violet-300",
  "MCP":             "bg-cyan-950/60 text-cyan-300",
  "GitHub Repos":    "bg-zinc-800/60 text-zinc-300",
  "Research Papers": "bg-amber-950/60 text-amber-300",
  "AI Startups":     "bg-sky-950/60 text-sky-300",
  "Benchmarks":      "bg-rose-950/60 text-rose-300",
  "Tools":           "bg-teal-950/60 text-teal-300",
  "Security":        "bg-red-950/60 text-red-300",
};

const riskStyles: Record<RiskLevel, { badge: string; border: string }> = {
  high: {
    badge: "border border-red-500/50 bg-red-500/10 text-red-400",
    border: "border-red-500/25",
  },
  medium: {
    badge: "border border-amber-500/50 bg-amber-500/10 text-amber-400",
    border: "border-amber-500/20",
  },
  low: {
    badge: "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    border: "border-zinc-800",
  },
};

const signalStyles: Record<SignalLevel, string> = {
  "High Signal": "bg-orange-500/10 text-orange-400",
  "Relevant": "bg-cyan-500/10 text-cyan-400",
  "General": "bg-zinc-800/60 text-zinc-500",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAge(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const RISK_LABEL: Record<RiskLevel, string> = {
  high: "High Opportunity",
  medium: "Medium Risk",
  low: "Low Risk",
};

// ─── Highlight renderer ───────────────────────────────────────────────────────
// Renders plain text with cyan highlights at the given Fuse.js index ranges.

function HighlightedText({
  text,
  ranges,
}: {
  text: string;
  ranges?: readonly [number, number][];
}) {
  if (!ranges?.length) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);

  for (const [start, end] of sorted) {
    if (start > cursor) parts.push(text.slice(cursor, start));
    parts.push(
      <mark
        key={start}
        className="rounded-[2px] bg-cyan-500/20 text-cyan-200 not-italic"
      >
        {text.slice(start, end + 1)}
      </mark>
    );
    cursor = end + 1;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <>{parts}</>;
}

// ─── Component ────────────────────────────────────────────────────────────────

const workspaceStyles: Record<
  Exclude<WorkspaceStatus, "ignored">,
  { badge: string; label: string }
> = {
  saved:         { badge: "border border-cyan-500/40 bg-cyan-500/10 text-cyan-300",    label: "WATCHING" },
  investigating: { badge: "border border-amber-500/40 bg-amber-500/10 text-amber-300", label: "RESEARCHING" },
  reviewed:      { badge: "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300", label: "BUILT" },
};

export default function NewsCard({
  item,
  relevantToYou = false,
  highlights,
  workspaceStatus,
  scoreComponents,
}: {
  item: NewsItem;
  relevantToYou?: boolean;
  highlights?: MatchHighlights;
  workspaceStatus?: WorkspaceStatus;
  scoreComponents?: ScoreComponents;
}) {
  const router = useRouter();
  const catStyle = categoryStyles[item.category] ?? "bg-zinc-800 text-zinc-300";
  const risk = item.intelligence.risk_level;
  const { badge: riskBadge, border: riskBorder } = riskStyles[risk];
  // Hide recommendation badge when workspace status is already displayed to avoid duplicate signals
  const recommendation = (item.builderScore !== undefined && item.builderScore > 0 && !workspaceStatus)
    ? getRecommendedAction(item.builderScore)
    : null;

  const displaySummary = item.intelligence.ai_summary || item.summary;

  function handleCardClick() {
    if (item.id) {
      router.push(`/article/${item.id}`);
    }
  }

  return (
    <article
      onClick={handleCardClick}
      className={clsx(
        "group flex flex-col gap-4 rounded-xl border bg-zinc-900 p-5 transition-colors hover:border-zinc-600",
        item.id ? "cursor-pointer" : "",
        riskBorder
      )}
    >
      {/* ── Row 1: category · risk · signal · relevant · link ── */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={clsx("rounded-md px-2 py-0.5 text-xs font-medium", catStyle)}>
            {item.category}
          </span>
          <span className={clsx("rounded-md px-2 py-0.5 text-xs font-semibold", riskBadge)}>
            {RISK_LABEL[risk]}
          </span>
          <span className={clsx("rounded-md px-2 py-0.5 text-xs", signalStyles[item.signal])}>
            {item.signal}
          </span>
          {item.title.startsWith("[TEST]") && (
            <span className="rounded-md border border-cyan-400/50 bg-cyan-400/10 px-2 py-0.5 text-xs font-semibold tracking-wide text-cyan-300">
              LIVE TEST
            </span>
          )}
          {relevantToYou && (
            <span className="rounded-md border border-violet-500/40 bg-violet-500/10 px-2 py-0.5 text-xs font-semibold tracking-wide text-violet-300">
              RELEVANT TO YOU
            </span>
          )}
          {workspaceStatus && workspaceStatus !== "ignored" && (
            <span
              className={clsx(
                "rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide",
                workspaceStyles[workspaceStatus].badge
              )}
            >
              {workspaceStyles[workspaceStatus].label}
            </span>
          )}

          {/* ── Recommended action badge ── */}
          {recommendation && (
            <span
              className={clsx(
                "flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold",
                recommendation.badge
              )}
              title={`Recommended: ${recommendation.action}`}
            >
              <span className={clsx("h-1.5 w-1.5 rounded-full",
                recommendation.priority === 1 ? "animate-pulse" : "",
                recommendation.dot
              )} />
              {recommendation.shortLabel}
            </span>
          )}
        </div>

        {/* ── Builder Score badge ── */}
        {item.builderScore !== undefined && item.builderScore > 0 && (
          <div className="group/score relative ml-auto shrink-0">
            <span
              className={clsx(
                "cursor-default rounded-md px-2 py-0.5 text-xs font-semibold tracking-wide",
                builderScoreBadgeStyle(item.builderScore)
              )}
            >
              BUILD SCORE {item.builderScore}
            </span>

            {/* CSS-only tooltip */}
            {item.scoreBreakdown && (
              <div className="invisible absolute right-0 top-full z-30 mt-1.5 w-52 rounded-lg border border-zinc-700 bg-zinc-900 p-3 shadow-xl group-hover/score:visible">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  Build Score
                </p>
                {[
                  ["Virality",          item.scoreBreakdown.virality,          50],
                  ["Freshness",         item.scoreBreakdown.freshness,         30],
                  ["Build Potential",   item.scoreBreakdown.build_potential,   25],
                  ["Content Potential", item.scoreBreakdown.content_potential, 20],
                ].map(([label, val, max]) => (
                  <div key={label as string} className="flex items-center justify-between py-0.5">
                    <span className="text-xs text-zinc-400">{label as string}</span>
                    <span className="font-mono text-xs text-slate-200">
                      {val as number}
                      <span className="text-zinc-600">/{max}</span>
                    </span>
                  </div>
                ))}
                <div className="border-t border-zinc-800/60 my-1" />
                {[
                  ["Tech Depth", item.scoreBreakdown.technical_depth],
                  ["Relevance",  item.scoreBreakdown.relevance],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex items-center justify-between py-0.5">
                    <span className="text-xs text-zinc-600">{label as string}</span>
                    <span className="font-mono text-xs text-zinc-600">{val as number}</span>
                  </div>
                ))}
                <div className="mt-2 flex items-center justify-between border-t border-zinc-800 pt-2">
                  <span className="text-xs font-semibold text-zinc-300">Total</span>
                  <span className={clsx("font-mono text-xs font-bold", builderScoreBadgeStyle(item.builderScore).split(" ").at(-1))}>
                    {item.builderScore}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open original source"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 rounded-md p-1 text-zinc-600 opacity-0 transition-all group-hover:opacity-100 hover:text-slate-100"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      {/* ── Title ── */}
      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-100">
        <HighlightedText text={item.title} ranges={highlights?.title} />
      </h3>

      {/* ── AI Summary ── */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
          AI Summary
        </p>
        <p className="text-sm leading-relaxed text-zinc-300">
          <HighlightedText text={displaySummary} ranges={highlights?.aiSummary} />
        </p>
      </div>

      {/* ── Why This Matters ── */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
        <div className="mb-1.5 flex items-center gap-1.5">
          <Lightbulb size={12} className="text-cyan-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
            Why This Matters
          </span>
        </div>
        <p className="text-xs leading-relaxed text-zinc-400">
          {item.intelligence.why_it_matters || "Builder relevance still being analyzed."}
        </p>
      </div>

      {/* ── Humor ── */}
      {item.intelligence.humor && (
        <p className="text-xs italic text-zinc-600">
          &ldquo;{item.intelligence.humor}&rdquo;
        </p>
      )}

      {/* ── Footer ── */}
      <div className="mt-auto flex items-center justify-between border-t border-zinc-800/60 pt-3">
        <span className="text-xs font-medium text-zinc-500">{item.source}</span>

        <div className="flex items-center gap-3">
          {item.intelligence.readTime && (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <Clock size={11} />
              {item.intelligence.readTime}
            </span>
          )}

          <ShieldAlert
            size={12}
            className={clsx(
              risk === "high"
                ? "text-red-500"
                : risk === "medium"
                ? "text-amber-500"
                : "text-emerald-600"
            )}
          />

          <span className="text-xs text-zinc-600">{formatAge(item.publishedAt)}</span>
        </div>
      </div>

      {/* ── Why am I seeing this? ── */}
      {scoreComponents
        ? <WhyThisCard components={scoreComponents} />
        : item.id && <WhySeeingPanel articleId={item.id} />}
    </article>
  );
}
