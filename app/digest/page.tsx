"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  Loader2,
  RefreshCw,
  SearchCode,
  Shield,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import Header from "@/components/Header";
import type { DigestData } from "@/src/lib/supabase/digest";

// ─── Style helpers ────────────────────────────────────────────────────────────

const PRIORITY_CFG: Record<
  1 | 2 | 3 | 4,
  { bar: string; badge: string; dot: string; label: string }
> = {
  1: { bar: "bg-red-500",    badge: "border-red-500/40 bg-red-500/10 text-red-300",       dot: "bg-red-500",    label: "Investigate Now" },
  2: { bar: "bg-amber-400",  badge: "border-amber-500/40 bg-amber-500/10 text-amber-300", dot: "bg-amber-400",  label: "Monitor" },
  3: { bar: "bg-yellow-500", badge: "border-yellow-500/30 bg-yellow-500/8 text-yellow-400", dot: "bg-yellow-500", label: "Review Later" },
  4: { bar: "bg-zinc-600",   badge: "border-zinc-700 bg-zinc-800/60 text-zinc-500",       dot: "bg-zinc-600",   label: "Archive" },
};

function scoreColor(score: number): string {
  if (score >= 90) return "text-red-400";
  if (score >= 60) return "text-orange-400";
  if (score >= 30) return "text-yellow-400";
  return "text-zinc-500";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(m / 60);
  if (h < 1) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent: "red" | "amber" | "cyan" | "zinc";
}) {
  const colors: Record<string, string> = {
    red:   "text-red-400 border-red-500/20 bg-red-500/5",
    amber: "text-amber-400 border-amber-500/20 bg-amber-500/5",
    cyan:  "text-cyan-400 border-cyan-500/20 bg-cyan-500/5",
    zinc:  "text-zinc-400 border-zinc-700 bg-zinc-800/40",
  };
  return (
    <div className={clsx("rounded-xl border p-4", colors[accent])}>
      <div className="mb-2 flex items-center gap-2 opacity-70">{icon}<span className="text-[10px] font-semibold uppercase tracking-widest">{label}</span></div>
      <p className="font-mono text-2xl font-bold tracking-tight">{value}</p>
    </div>
  );
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count?: number }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-zinc-500">{icon}</span>
      <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{title}</h2>
      {count !== undefined && (
        <span className="ml-auto rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
          {count}
        </span>
      )}
    </div>
  );
}

function ThreatRow({
  rank,
  threat,
}: {
  rank: number;
  threat: DigestData["topThreats"][0];
}) {
  const cfg = PRIORITY_CFG[threat.priority];
  return (
    <Link
      href={`/article/${threat.id}`}
      className="group flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3.5 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60"
    >
      {/* Rank */}
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold text-zinc-600 ring-1 ring-zinc-700">
        {rank}
      </span>

      {/* Priority bar */}
      <div className={clsx("mt-1 h-full w-0.5 shrink-0 self-stretch rounded-full", cfg.bar)} />

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-200 group-hover:text-slate-100">
          {threat.title}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-500">
            {threat.category}
          </span>
          <span className={clsx("font-mono text-xs font-bold", scoreColor(threat.threatScore))}>
            {threat.threatScore}
          </span>
          <span className={clsx("rounded-md border px-1.5 py-0.5 text-[10px] font-semibold", cfg.badge)}>
            {threat.recommendation}
          </span>
        </div>
      </div>

      <ChevronRight size={13} className="mt-1 shrink-0 text-zinc-700 transition-colors group-hover:text-zinc-400" />
    </Link>
  );
}

function InvestigationRow({ item }: { item: DigestData["openInvestigations"][0] }) {
  return (
    <Link
      href={`/article/${item.articleId}`}
      className="group flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-600"
    >
      <SearchCode size={14} className={clsx("shrink-0", item.isCritical ? "text-red-400" : "text-amber-400")} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-300 group-hover:text-slate-100">
          {item.title}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <Clock size={10} className="text-zinc-600" />
          <span className={clsx("text-[10px]", item.isStale ? "text-red-400" : "text-zinc-500")}>
            {item.ageLabel}{item.isStale && " · overdue"}
          </span>
          {item.isCritical && (
            <span className="rounded-md border border-red-500/30 bg-red-500/8 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-red-400">
              Critical
            </span>
          )}
        </div>
      </div>

      <span className={clsx("shrink-0 font-mono text-xs font-bold", scoreColor(item.threatScore))}>
        {item.threatScore}
      </span>
    </Link>
  );
}

function ActionRow({ action }: { action: DigestData["recommendedActions"][0] }) {
  const cfg = PRIORITY_CFG[action.priority];
  return (
    <Link
      href={`/article/${action.articleId}`}
      className="group flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 transition-colors hover:border-zinc-600"
    >
      <span className={clsx("h-2 w-2 shrink-0 rounded-full", action.priority === 1 ? "animate-pulse" : "", cfg.dot)} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-slate-300 group-hover:text-slate-100">
          {action.title}
        </p>
        <span className="text-[10px] text-zinc-600">{action.category}</span>
      </div>

      <span className={clsx("shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold", cfg.badge)}>
        {action.action}
      </span>
    </Link>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function DigestSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-28 rounded-2xl border border-zinc-800 bg-zinc-900/60" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-xl border border-zinc-800 bg-zinc-900/60" />)}
      </div>
      {[180, 160, 160].map((h, i) => (
        <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/60" style={{ height: h }} />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DigestPage() {
  const [digest, setDigest] = useState<DigestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res  = await fetch("/api/digest");
      const json = await res.json() as { ok: boolean; digest?: DigestData; error?: string };
      if (!json.ok || !json.digest) throw new Error(json.error ?? "Failed to load digest");
      setDigest(json.digest);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const { criticalCount = 0, investigatingCount = 0, savedCount = 0, totalTracked = 0 } =
    digest?.summary ?? {};

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />

      <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-8 sm:px-6 animate-page-enter">

        {/* ── Nav ── */}
        <div className="mb-7 flex items-center justify-between">
          <Link href="/feed" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition-colors hover:text-slate-300">
            <ArrowLeft size={12} /> Back to feed
          </Link>

          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-slate-200 disabled:opacity-40"
          >
            <RefreshCw size={11} className={clsx(refreshing && "animate-spin")} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {loading ? (
          <DigestSkeleton />
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
            <AlertTriangle size={20} className="mx-auto mb-3 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
            <button onClick={() => load()} className="mt-4 text-xs text-zinc-500 hover:text-slate-300 transition-colors">
              Try again
            </button>
          </div>
        ) : digest && (
          <div className="space-y-5">

            {/* ── Hero card ── */}
            <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 p-6">
              {/* Ambient glow */}
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/5 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-red-500/5 blur-2xl" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <Zap size={13} className="text-cyan-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-500">
                      {digest.period} Security Brief
                    </span>
                  </div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-100">
                    Daily Threat Digest
                  </h1>
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Generated {timeAgo(digest.generatedAt)}
                  </p>
                </div>

                {criticalCount > 0 && (
                  <div className="animate-pulse-slow shrink-0 rounded-xl border border-red-500/40 bg-red-500/8 px-4 py-3 text-center">
                    <p className="font-mono text-2xl font-bold text-red-400">{criticalCount}</p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-red-500">Critical</p>
                  </div>
                )}
              </div>

              {/* One-line summary */}
              <p className="relative mt-5 text-sm text-zinc-400">
                {totalTracked === 0
                  ? "No threats tracked yet — start investigating from your feed."
                  : `Tracking ${totalTracked} threat${totalTracked !== 1 ? "s" : ""}${criticalCount > 0 ? ` · ${criticalCount} critical` : ""}${investigatingCount > 0 ? ` · ${investigatingCount} under investigation` : ""}.`}
              </p>
            </div>

            {/* ── Summary stat cards ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={<ShieldAlert size={13} />} label="Critical"       value={criticalCount}      accent="red"   />
              <StatCard icon={<SearchCode  size={13} />} label="Investigating"  value={investigatingCount} accent="amber" />
              <StatCard icon={<Shield      size={13} />} label="Saved"          value={savedCount}         accent="cyan"  />
              <StatCard icon={<CheckCircle2 size={13}/>} label="Total tracked"  value={totalTracked}       accent="zinc"  />
            </div>

            {/* ── Top 5 threats ── */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <SectionHeader icon={<Flame size={13} />} title="Top Threats" count={digest.topThreats.length} />

              {digest.topThreats.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-600">No threats scored yet — run a feed sync first.</p>
              ) : (
                <div className="space-y-2">
                  {digest.topThreats.map((t, i) => (
                    <ThreatRow key={t.id} rank={i + 1} threat={t} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Open investigations ── */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <SectionHeader icon={<SearchCode size={13} />} title="Open Investigations" count={investigatingCount} />

              {digest.openInvestigations.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-600">
                  No open investigations.{" "}
                  <Link href="/feed" className="text-cyan-600 hover:text-cyan-400 transition-colors">
                    Start from the feed →
                  </Link>
                </p>
              ) : (
                <div className="space-y-2">
                  {digest.openInvestigations.map((inv) => (
                    <InvestigationRow key={inv.articleId} item={inv} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Recommended actions ── */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <SectionHeader icon={<ArrowRight size={13} />} title="Recommended Actions" count={digest.recommendedActions.length} />

              {digest.recommendedActions.length === 0 ? (
                <p className="py-6 text-center text-xs text-zinc-600">No recommendations available.</p>
              ) : (
                <div className="space-y-2">
                  {digest.recommendedActions.map((a) => (
                    <ActionRow key={a.articleId} action={a} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-between rounded-xl border border-zinc-800/50 bg-zinc-900/30 px-4 py-3">
              <span className="text-[10px] text-zinc-600">
                AI News Radar · {digest.period} Brief · {new Date(digest.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <Link href="/workspace" className="flex items-center gap-1 text-[10px] text-cyan-600 transition-colors hover:text-cyan-400">
                Open workspace <ArrowRight size={9} />
              </Link>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
