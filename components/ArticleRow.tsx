import Link from "next/link";
import { ArrowUpRight, Clock } from "lucide-react";
import { clsx } from "clsx";
import type { FeedItem } from "@/src/lib/rss/fetchFeeds";

// ─── Category colors ──────────────────────────────────────────────────────────

const CAT_DOT: Record<string, string> = {
  "OpenAI":           "bg-emerald-400",
  "Anthropic":        "bg-violet-400",
  "Coding Agents":    "bg-cyan-400",
  "MCP":              "bg-sky-400",
  "GitHub Repos":     "bg-amber-400",
  "Research Papers":  "bg-rose-400",
  "AI Startups":      "bg-orange-400",
  "Benchmarks":       "bg-yellow-400",
  "Tools":            "bg-teal-400",
  "Security":         "bg-red-400",
};

const SCORE_CLS = (score: number) =>
  score >= 90 ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
  : score >= 70 ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
  : score >= 40 ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
  : "border-zinc-700 bg-zinc-800 text-zinc-500";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1)  return `${Math.floor(diff / 60_000)}m ago`;
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArticleRow({ item }: { item: FeedItem }) {
  const score   = item.builderScore ?? 0;
  const summary = item.intelligence?.ai_summary || item.summary;
  const dotCls  = CAT_DOT[item.category] ?? "bg-zinc-500";
  const href    = item.id ? `/article/${item.id}` : item.link;

  return (
    <Link
      href={href}
      className="group flex items-start gap-3.5 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3.5 transition-all hover:border-zinc-700 hover:bg-zinc-900"
    >
      {/* Category dot */}
      <span className={clsx("mt-1.5 h-2 w-2 shrink-0 rounded-full", dotCls)} />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 line-clamp-1 text-sm font-medium text-zinc-100 group-hover:text-white">
          {item.title}
        </p>
        {summary && (
          <p className="mb-1.5 line-clamp-1 text-xs text-zinc-500">
            {summary}
          </p>
        )}
        <div className="flex items-center gap-2 text-[10px] text-zinc-600">
          <span>{item.source}</span>
          <span>·</span>
          <span className="flex items-center gap-0.5">
            <Clock size={9} />
            {relativeTime(item.publishedAt)}
          </span>
          <span>·</span>
          <span>{item.category}</span>
        </div>
      </div>

      {/* Score badge */}
      {score > 0 && (
        <span className={clsx(
          "shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
          SCORE_CLS(score)
        )}>
          {score}
        </span>
      )}

      {/* Arrow */}
      <ArrowUpRight
        size={13}
        className="mt-0.5 shrink-0 text-zinc-700 transition-colors group-hover:text-zinc-400"
      />
    </Link>
  );
}
