import { ExternalLink, Calendar } from "lucide-react";
import { clsx } from "clsx";
import type { SignalLevel } from "@/src/lib/rss/filterNews";

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
}

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

const signalStyles: Record<SignalLevel, string> = {
  "High Signal": "border border-orange-500/50 bg-orange-500/10 text-orange-400",
  "Relevant": "border border-cyan-500/40 bg-cyan-500/10 text-cyan-400",
  "General": "border border-zinc-700 bg-zinc-800/60 text-zinc-500",
};

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

export default function NewsCard({ item }: { item: NewsItem }) {
  const catStyle = categoryStyles[item.category] ?? "bg-zinc-800 text-zinc-300";

  return (
    <article
      className={clsx(
        "group flex flex-col gap-3 rounded-xl border bg-zinc-900 p-5 transition-colors hover:border-zinc-700",
        item.signal === "High Signal"
          ? "border-orange-500/30"
          : "border-zinc-800"
      )}
    >
      {/* Top row: category + signal + link */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={clsx("rounded-md px-2 py-0.5 text-xs font-medium", catStyle)}>
            {item.category}
          </span>
          <span
            className={clsx(
              "rounded-md px-2 py-0.5 text-xs font-semibold",
              signalStyles[item.signal]
            )}
          >
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

      {/* Title + summary */}
      <div className="flex flex-col gap-2">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-100">
          {item.title}
        </h3>
        {item.summary && (
          <p className="line-clamp-3 text-sm leading-relaxed text-zinc-400">
            {item.summary}
          </p>
        )}
      </div>

      {/* Footer: source + age + debug score */}
      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="text-xs font-medium text-zinc-500">{item.source}</span>
        <div className="flex items-center gap-2">
          <span
            title="Relevance score (debug)"
            className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-600"
          >
            {item.relevanceScore}
          </span>
          <span className="flex items-center gap-1 text-xs text-zinc-600">
            <Calendar size={11} />
            {formatAge(item.publishedAt)}
          </span>
        </div>
      </div>
    </article>
  );
}
