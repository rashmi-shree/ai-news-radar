import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  ShieldAlert,
  Lightbulb,
  Quote,
  Zap,
  Activity,
  Timer,
  Star,
} from "lucide-react";
import { clsx } from "clsx";
import Header from "@/components/Header";
import ThreatActions from "@/components/ThreatActions";
import InvestigationNotes from "@/components/InvestigationNotes";
import ResearchPanel from "@/components/ResearchPanel";
import BuildIdeaPanel from "@/components/BuildIdeaPanel";
import ContentPanel from "@/components/ContentPanel";
import AddToCollectionButton from "@/components/AddToCollectionButton";
import WhySeeingPanel from "@/components/WhySeeingPanel";
import ArticleViewLogger from "@/components/ArticleViewLogger";
import { getBuildIdea } from "@/src/lib/supabase/builderActions";
import { getAllContentGenerations } from "@/src/lib/supabase/contentGenerations";
import { getArticleById, getRelatedArticles } from "@/src/lib/supabase/articles";
import type { FeedItem } from "@/src/lib/rss/fetchFeeds";
import type { RiskLevel } from "@/src/lib/ai/types";
import type { SignalLevel } from "@/src/lib/rss/filterNews";
import {
  builderScoreBadgeStyle,
  generateScoreExplanation,
  getRecommendedAction,
  type ScoreBreakdown,
} from "@/src/lib/scoring/threatScore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatAge(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(iso);
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

const riskStyles: Record<RiskLevel, { badge: string; bar: string; label: string }> = {
  high: {
    badge: "border border-red-500/50 bg-red-500/10 text-red-400",
    bar:   "bg-red-500/40",
    label: "High Opportunity",
  },
  medium: {
    badge: "border border-amber-500/50 bg-amber-500/10 text-amber-400",
    bar:   "bg-amber-500/30",
    label: "Medium Risk",
  },
  low: {
    badge: "border border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    bar:   "bg-emerald-500/20",
    label: "Low Risk",
  },
};

const signalStyles: Record<SignalLevel, string> = {
  "High Signal": "bg-orange-500/10 text-orange-400",
  "Relevant":    "bg-cyan-500/10 text-cyan-400",
  "General":     "bg-zinc-800/60 text-zinc-500",
};

// ─── Related article mini-card ─────────────────────────────────────────────────

function RelatedCard({ item }: { item: FeedItem }) {
  const risk = item.intelligence.risk_level;
  const catStyle = categoryStyles[item.category] ?? "bg-zinc-800 text-zinc-300";

  return (
    <Link
      href={`/article/${item.id}`}
      className="group flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-all hover:border-zinc-600 hover:bg-zinc-800/60"
    >
      <div className="flex flex-wrap gap-1.5">
        <span className={clsx("rounded-md px-2 py-0.5 text-xs font-medium", catStyle)}>
          {item.category}
        </span>
        <span className={clsx("rounded-md border px-2 py-0.5 text-xs font-semibold", riskStyles[risk].badge)}>
          {riskStyles[risk].label}
        </span>
      </div>
      <p className="line-clamp-2 text-xs font-medium leading-snug text-slate-200 group-hover:text-white">
        {item.title}
      </p>
      <p className="mt-auto text-xs text-zinc-600">{item.source}</p>
    </Link>
  );
}

// ─── Threat Breakdown Cards ───────────────────────────────────────────────────

type Tier = "Critical" | "High" | "Medium" | "Low";

function tier(val: number, max: number): Tier {
  const pct = (val / max) * 100;
  if (pct >= 90) return "Critical";
  if (pct >= 70) return "High";
  if (pct >= 40) return "Medium";
  return "Low";
}

const TIER_STYLES: Record<Tier, { badge: string; bar: string; glow: string; text: string }> = {
  Critical: {
    badge: "border border-red-500/60 bg-red-500/15 text-red-400",
    bar:   "bg-red-500/70",
    glow:  "shadow-[0_0_12px_0px_rgba(239,68,68,0.25)] border-red-500/30",
    text:  "text-red-400",
  },
  High: {
    badge: "border border-orange-500/60 bg-orange-500/15 text-orange-400",
    bar:   "bg-orange-500/70",
    glow:  "shadow-[0_0_12px_0px_rgba(249,115,22,0.2)] border-orange-500/30",
    text:  "text-orange-400",
  },
  Medium: {
    badge: "border border-yellow-500/60 bg-yellow-500/15 text-yellow-400",
    bar:   "bg-yellow-500/70",
    glow:  "shadow-[0_0_8px_0px_rgba(234,179,8,0.15)] border-yellow-500/30",
    text:  "text-yellow-400",
  },
  Low: {
    badge: "border border-zinc-600 bg-zinc-800/60 text-zinc-500",
    bar:   "bg-zinc-600",
    glow:  "border-zinc-800",
    text:  "text-zinc-500",
  },
};

interface BreakdownCardProps {
  label: string;
  icon: React.ReactNode;
  val: number;
  max: number;
  unit?: string;
}

function BreakdownCard({ label, icon, val, max, unit }: BreakdownCardProps) {
  const t     = tier(val, max);
  const style = TIER_STYLES[t];
  const pct   = Math.min(Math.round((val / max) * 100), 100);

  return (
    <div
      className={clsx(
        "flex flex-col gap-3 rounded-xl border bg-zinc-950/80 p-4 transition-all",
        style.glow
      )}
    >
      {/* Label + icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={clsx("opacity-70", style.text)}>{icon}</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            {label}
          </span>
        </div>
        <span className={clsx("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest", style.badge)}>
          {t}
        </span>
      </div>

      {/* Score */}
      <div className="flex items-end gap-1">
        <span className={clsx("font-mono text-2xl font-bold leading-none", style.text)}>
          {val}
        </span>
        <span className="mb-0.5 font-mono text-xs text-zinc-700">
          /{max}{unit}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className={clsx("h-1 rounded-full transition-all duration-700", style.bar)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BuilderBreakdownCards({ breakdown }: { breakdown: ScoreBreakdown }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center gap-2">
        <Zap size={13} className="text-amber-400" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          Build Score
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BreakdownCard
          label="Build Score"
          icon={<Zap size={12} />}
          val={breakdown.total}
          max={125}
        />
        <BreakdownCard
          label="Virality"
          icon={<Activity size={12} />}
          val={breakdown.virality}
          max={50}
        />
        <BreakdownCard
          label="Freshness"
          icon={<Timer size={12} />}
          val={breakdown.freshness}
          max={30}
        />
        <BreakdownCard
          label="Build Potential"
          icon={<Star size={12} />}
          val={breakdown.build_potential}
          max={25}
        />
      </div>
    </section>
  );
}

// ─── Threat Score Panel (enhanced) ───────────────────────────────────────────

const VERDICT_STYLES = {
  hot: {
    border:   "border-rose-500/30",
    accent:   "bg-rose-500",
    chipBg:   "bg-rose-500/15 border-rose-500/40 text-rose-300",
    bar:      "bg-rose-500/60",
    headText: "text-rose-300",
    bullet:   "bg-rose-500/50",
    label:    "HOT",
    labelCls: "border border-rose-500/50 bg-rose-500/15 text-rose-400",
  },
  rising: {
    border:   "border-amber-500/25",
    accent:   "bg-amber-500",
    chipBg:   "bg-amber-500/15 border-amber-500/40 text-amber-300",
    bar:      "bg-amber-500/60",
    headText: "text-amber-300",
    bullet:   "bg-amber-500/50",
    label:    "RISING",
    labelCls: "border border-amber-500/50 bg-amber-500/15 text-amber-400",
  },
  watch: {
    border:   "border-cyan-500/20",
    accent:   "bg-cyan-500",
    chipBg:   "bg-cyan-500/15 border-cyan-500/40 text-cyan-300",
    bar:      "bg-cyan-500/60",
    headText: "text-cyan-300",
    bullet:   "bg-cyan-500/50",
    label:    "WATCH",
    labelCls: "border border-cyan-500/50 bg-cyan-500/15 text-cyan-400",
  },
  normal: {
    border:   "border-zinc-800",
    accent:   "bg-zinc-700",
    chipBg:   "bg-zinc-800 border-zinc-700 text-zinc-400",
    bar:      "bg-zinc-600/60",
    headText: "text-zinc-400",
    bullet:   "bg-zinc-600",
    label:    "NORMAL",
    labelCls: "border border-zinc-700 bg-zinc-800 text-zinc-500",
  },
} as const;

const COMPONENT_CFG = [
  { key: "virality"          as const, label: "Virality",          max: 50, barColor: "bg-rose-500/70",   chipColor: "bg-rose-500/15   border-rose-500/40   text-rose-300"   },
  { key: "freshness"         as const, label: "Freshness",         max: 30, barColor: "bg-sky-500/70",    chipColor: "bg-sky-500/15    border-sky-500/40    text-sky-300"    },
  { key: "build_potential"   as const, label: "Build Potential",   max: 25, barColor: "bg-violet-500/70", chipColor: "bg-violet-500/15 border-violet-500/40 text-violet-300" },
  { key: "content_potential" as const, label: "Content Potential", max: 20, barColor: "bg-emerald-500/70",chipColor: "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"},
] satisfies { key: keyof Omit<ScoreBreakdown, "total" | "technical_depth" | "relevance">; label: string; max: number; barColor: string; chipColor: string }[];

function BuilderScorePanel({
  breakdown,
  article,
}: {
  breakdown: ScoreBreakdown;
  article: {
    category:    string;
    signal:      string;
    publishedAt: string;
    intelligence: { risk_level: string };
  };
}) {
  const { total, technical_depth, relevance } = breakdown;
  const explanation = generateScoreExplanation(breakdown, article);
  const vs = VERDICT_STYLES[explanation.verdict];

  return (
    <section className="mb-8">
      <div className={clsx("relative overflow-hidden rounded-xl border bg-zinc-950/80", vs.border)}>

        {/* Top accent line */}
        <div className={clsx("h-0.5 w-full", vs.accent)} />

        <div className="p-5">
          {/* ── Header row ── */}
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-amber-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                Build Score
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className={clsx("rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest", vs.labelCls)}>
                {vs.label}
              </span>
              <span className={clsx("rounded-md px-2.5 py-0.5 font-mono text-xl font-bold", builderScoreBadgeStyle(total))}>
                {total}
                <span className="ml-1 text-xs font-normal text-zinc-600">/ 125</span>
              </span>
            </div>
          </div>

          {/* ── Score components ── */}
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
            Score components
          </p>

          <div className="mb-5 flex flex-col gap-4">
            {COMPONENT_CFG.map(({ key, label, max, barColor, chipColor }) => {
              const val = breakdown[key];
              const pct = Math.min(Math.round((val / max) * 100), 100);
              return (
                <div key={key}>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-16 text-xs text-zinc-400">{label}</span>
                      {/* +N pts chip */}
                      <span className={clsx("rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold", chipColor)}>
                        +{val}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-zinc-600">
                      {val} <span className="text-zinc-800">/ {max}</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className={clsx("h-1.5 rounded-full transition-all duration-700", barColor)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Total row ── */}
          <div className="mb-6 flex items-center justify-between rounded-lg bg-zinc-900/60 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Total</span>
            <span className={clsx("font-mono text-sm font-bold", vs.headText)}>
              {breakdown.virality} + {breakdown.freshness} + {breakdown.build_potential} + {breakdown.content_potential}
              {" = "}
              <span className="text-base">{total}</span>
            </span>
          </div>

          {/* ── Why this score? ── */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb size={12} className={vs.headText} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                Why this score?
              </span>
            </div>

            {/* Headline */}
            <p className={clsx("mb-3 text-sm font-medium leading-snug", vs.headText)}>
              {explanation.headline}
            </p>

            {/* Reason bullets */}
            <ul className="flex flex-col gap-2">
              {explanation.reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className={clsx("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", vs.bullet)} />
                  <span className="text-xs leading-relaxed text-zinc-400">{reason}</span>
                </li>
              ))}
            </ul>

            {/* Context (not scored) */}
            {(technical_depth > 0 || relevance > 0) && (
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-zinc-800 pt-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-700">
                  Context (not scored)
                </span>
                {technical_depth > 0 && (
                  <span className="flex items-center gap-1 font-mono text-[10px] text-zinc-600">
                    Tech Depth
                    <span className={clsx(
                      "rounded px-1 py-0.5 text-[9px] font-bold uppercase",
                      technical_depth === 40 ? "text-violet-400" : technical_depth === 20 ? "text-cyan-500" : "text-zinc-600"
                    )}>
                      {technical_depth === 40 ? "DEEP" : technical_depth === 20 ? "MOD" : "LIGHT"}
                    </span>
                  </span>
                )}
                {relevance > 0 && (
                  <span className="font-mono text-[10px] text-zinc-600">
                    AI Relevance <span className="text-zinc-500">{relevance}/30</span>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // id is a UUID string — no parseInt needed
  if (!id || id.trim() === "") notFound();

  const article = await getArticleById(id);
  if (!article) notFound();

  const [related, initialBuildIdea, initialContent] = await Promise.all([
    getRelatedArticles(article.category, article.intelligence.risk_level, id),
    getBuildIdea(id),
    getAllContentGenerations(id),
  ]);

  const risk = (article.intelligence.risk_level ?? "low") as RiskLevel;
  const riskStyle = riskStyles[risk] ?? riskStyles.low;
  const catStyle = categoryStyles[article.category] ?? "bg-zinc-800 text-zinc-300";
  const displaySummary = article.intelligence.ai_summary || article.summary;
  const recommendation = (article.builderScore ?? 0) > 0
    ? getRecommendedAction(article.builderScore!)
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />
      <ArticleViewLogger articleId={article.id ?? ""} />

      {/* ── Risk accent bar ── */}
      <div className={clsx("h-0.5 w-full", riskStyle.bar)} />

      {/* ── Animated main content ── */}
      <main className="animate-page-enter mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">

        {/* ── Navigation ── */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/feed"
            className="flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-slate-100"
          >
            <ArrowLeft size={14} />
            Back to feed
          </Link>

          {article.link && (
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-slate-100"
            >
              <ExternalLink size={12} />
              Open original
            </a>
          )}
        </div>

        {/* ── Badge row ── */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className={clsx("rounded-md px-2 py-0.5 text-xs font-medium", catStyle)}>
            {article.category}
          </span>
          <span className={clsx("rounded-md px-2 py-0.5 text-xs font-semibold", riskStyle.badge)}>
            {riskStyle.label}
          </span>
          <span className={clsx("rounded-md px-2 py-0.5 text-xs", signalStyles[article.signal])}>
            {article.signal}
          </span>
          {(article.builderScore ?? 0) > 0 && (
            <span
              className={clsx(
                "flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-semibold",
                builderScoreBadgeStyle(article.builderScore!)
              )}
            >
              <Zap size={10} />
              BUILD SCORE {article.builderScore}
            </span>
          )}
          {recommendation && (
            <span
              className={clsx(
                "flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold",
                recommendation.badge
              )}
            >
              <span className={clsx(
                "h-1.5 w-1.5 rounded-full",
                recommendation.priority === 1 ? "animate-pulse" : "",
                recommendation.dot
              )} />
              {recommendation.action}
            </span>
          )}
        </div>

        {/* ── Title ── */}
        <h1 className="mb-5 text-2xl font-bold leading-snug text-slate-100 sm:text-3xl">
          {article.title}
        </h1>

        {/* ── Recommended action callout ── */}
        {recommendation && (
          <div className={clsx(
            "mb-6 flex items-center gap-3 rounded-xl border px-4 py-3",
            recommendation.priority === 1
              ? "border-red-500/25 bg-red-950/20"
              : recommendation.priority === 2
              ? "border-amber-500/20 bg-amber-950/15"
              : recommendation.priority === 3
              ? "border-yellow-500/15 bg-zinc-900/60"
              : "border-zinc-800 bg-zinc-900/40"
          )}>
            <span className={clsx(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border",
              recommendation.priority === 1
                ? "border-red-500/30 bg-red-500/10"
                : recommendation.priority === 2
                ? "border-amber-500/30 bg-amber-500/10"
                : "border-zinc-700 bg-zinc-800"
            )}>
              <ShieldAlert size={13} className={clsx(
                recommendation.priority === 1 ? "text-red-400"
                  : recommendation.priority === 2 ? "text-amber-400"
                  : recommendation.priority === 3 ? "text-yellow-500"
                  : "text-zinc-600"
              )} />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                Recommended Action
              </p>
              <p className={clsx("text-sm font-semibold", recommendation.badge.split(" ").at(-1))}>
                {recommendation.action}
              </p>
            </div>
            <span className={clsx(
              "ml-auto font-mono text-[10px] text-zinc-600",
            )}>
              score {article.builderScore}
            </span>
          </div>
        )}

        {/* ── Meta row ── */}
        <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-500">
          <span className="font-semibold text-zinc-400">{article.source}</span>
          <span>{formatDate(article.publishedAt)}</span>
          <span className="text-zinc-700">·</span>
          <span>{formatAge(article.publishedAt)}</span>
          {article.intelligence.readTime && (
            <>
              <span className="text-zinc-700">·</span>
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {article.intelligence.readTime}
              </span>
            </>
          )}
          <span className="text-zinc-700">·</span>
          <span className="flex items-center gap-1.5">
            <ShieldAlert
              size={11}
              className={clsx(
                risk === "high"   ? "text-red-500"
                : risk === "medium" ? "text-amber-500"
                : "text-emerald-500"
              )}
            />
            {riskStyle.label}
          </span>
        </div>

        <div className="mb-10 h-px bg-zinc-800" />

        {/* ── AI Summary ── */}
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-600">
            AI Summary
          </h2>
          <p className="text-base leading-relaxed text-zinc-200">{displaySummary}</p>
        </section>

        {/* ── Builder Score Panel ── */}
        {article.scoreBreakdown && article.scoreBreakdown.total > 0 && (
          <BuilderScorePanel breakdown={article.scoreBreakdown} article={article} />
        )}

        {/* ── Why This Matters ── */}
        <section className="mb-8">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Lightbulb size={14} className="text-cyan-400" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                Why This Matters
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-zinc-300">
              {article.intelligence.why_it_matters || "Builder relevance still being analyzed."}
            </p>
          </div>
        </section>

        {/* ── Original Summary ── */}
        {article.summary && article.summary !== displaySummary && (
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-600">
              Original Summary
            </h2>
            <p className="text-sm leading-relaxed text-zinc-400">{article.summary}</p>
          </section>
        )}

        {/* ── Humor note ── */}
        {article.intelligence.humor && (
          <section className="mb-8">
            <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-4">
              <Quote size={16} className="mt-0.5 shrink-0 text-zinc-700" />
              <p className="text-sm italic leading-relaxed text-zinc-500">
                {article.intelligence.humor}
              </p>
            </div>
          </section>
        )}

        <div className="mb-8 h-px bg-zinc-800" />


        {/* ── Threat Actions + Collection (client components) ── */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <ThreatActions articleId={id} />
          <AddToCollectionButton articleId={id} />
        </div>

        {/* ── Why am I seeing this? (client component) ── */}
        <WhySeeingPanel articleId={id} />

        {/* ── Research Panel (client component) ── */}
        <ResearchPanel articleId={id} initialBrief={article.researchBrief ?? null} />

        {/* ── Build Idea Panel (client component) ── */}
        <BuildIdeaPanel articleId={id} initialIdea={initialBuildIdea} />

        {/* ── Content Panel (client component) ── */}
        <ContentPanel articleId={id} initialContent={initialContent} />

        {/* ── Investigation Notes (client component) ── */}
        <InvestigationNotes articleId={id} />

        {/* ── Related articles ── */}
        {related.length > 0 && (
          <section className="mb-12">
            <h2 className="mb-4 text-sm font-semibold text-slate-100">Related articles</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {related.map((r) => (
                <RelatedCard key={r.id ?? r.link} item={r} />
              ))}
            </div>
          </section>
        )}

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-zinc-800 pt-6">
          <Link
            href="/feed"
            className="flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-slate-100"
          >
            <ArrowLeft size={14} />
            Back to feed
          </Link>

          {article.link && (
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400 transition-colors hover:border-cyan-500/50 hover:bg-cyan-500/20"
            >
              Open original article
              <ExternalLink size={13} />
            </a>
          )}
        </div>
      </main>
    </div>
  );
}
