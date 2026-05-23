import { ExternalLink, Clock, Lightbulb, ShieldAlert } from "lucide-react";
import { clsx } from "clsx";
import type { SignalLevel } from "@/src/lib/rss/filterNews";
import type { SummaryResult, RiskLevel } from "@/src/lib/ai/types";

export interface NewsItem {
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
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const categoryStyles: Record<string, string> = {
  "CVEs": "bg-red-950/60 text-red-300",
  "AI Security": "bg-indigo-950/60 text-indigo-300",
  "Threat Intelligence": "bg-amber-950/60 text-amber-300",
  "Red Team": "bg-rose-950/60 text-rose-300",
  "Blue Team": "bg-sky-950/60 text-sky-300",
  "SOC": "bg-emerald-950/60 text-emerald-300",
  "Cloud Security": "bg-violet-950/60 text-violet-300",
  "Kubernetes Security": "bg-cyan-950/60 text-cyan-300",
  "Honeypots": "bg-teal-950/60 text-teal-300",
  "Deception Technology": "bg-purple-950/60 text-purple-300",
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
  high: "High Risk",
  medium: "Medium Risk",
  low: "Low Risk",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewsCard({ item }: { item: NewsItem }) {
  const catStyle = categoryStyles[item.category] ?? "bg-zinc-800 text-zinc-300";
  const risk = item.intelligence.riskLevel;
  const { badge: riskBadge, border: riskBorder } = riskStyles[risk];

  return (
    <article
      className={clsx(
        "group flex flex-col gap-4 rounded-xl border bg-zinc-900 p-5 transition-colors hover:border-zinc-600",
        riskBorder
      )}
    >
      {/* ── Row 1: category · risk · signal · link ── */}
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
        </div>

        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open article"
            className="shrink-0 rounded-md p-1 text-zinc-600 opacity-0 transition-all group-hover:opacity-100 hover:text-slate-100"
          >
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      {/* ── Title ── */}
      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-100">
        {item.title}
      </h3>

      {/* ── AI Summary ── */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
          AI Summary
        </p>
        <p className="text-sm leading-relaxed text-zinc-300">
          {item.intelligence.summary}
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
          {item.intelligence.whyItMatters}
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
          {/* read time */}
          <span className="flex items-center gap-1 text-xs text-zinc-500">
            <Clock size={11} />
            {item.intelligence.readTime}
          </span>

          {/* risk icon */}
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

          {/* debug score */}
          <span
            title="Relevance score (debug)"
            className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600"
          >
            {item.relevanceScore}
          </span>

          {/* age */}
          <span className="text-xs text-zinc-600">{formatAge(item.publishedAt)}</span>
        </div>
      </div>
    </article>
  );
}
