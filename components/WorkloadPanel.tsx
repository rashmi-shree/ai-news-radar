"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Flame,
  Loader2,
  SearchCode,
  ShieldAlert,
  Siren,
} from "lucide-react";
import { clsx } from "clsx";
import { getWorkloadData, type WorkloadData, type InvestigationItem } from "@/src/lib/supabase/workloadData";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatRow({
  Icon,
  iconClass,
  label,
  value,
  valueClass = "text-slate-200",
  sublabel,
}: {
  Icon:        React.ElementType;
  iconClass:   string;
  label:       string;
  value:       string | number;
  valueClass?: string;
  sublabel?:   string;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-zinc-800/60 last:border-0">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
        <Icon size={14} className={iconClass} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-400">{label}</p>
        {sublabel && <p className="text-[10px] text-zinc-700 truncate">{sublabel}</p>}
      </div>
      <span className={clsx("font-mono text-sm font-bold tabular-nums shrink-0", valueClass)}>
        {value}
      </span>
    </div>
  );
}

// ─── Stale item row ───────────────────────────────────────────────────────────

function StaleRow({ item }: { item: InvestigationItem }) {
  return (
    <Link
      href={`/article/${item.articleId}`}
      className="group flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-800/60"
    >
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-amber-500/30 bg-amber-500/10">
        <AlertTriangle size={11} className="text-amber-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-zinc-300 group-hover:text-slate-100">
          {item.articleTitle}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-[10px] text-amber-500">
            <Clock size={9} />
            {item.ageLabel} old
          </span>
          {item.isCritical && (
            <span className="flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-red-400">
              <Flame size={8} />
              Critical
            </span>
          )}
          <span className="font-mono text-[10px] text-zinc-600">
            score {item.builderScore}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Needs-attention banner ───────────────────────────────────────────────────

function AttentionBanner({ staleCount, criticalCount }: { staleCount: number; criticalCount: number }) {
  const parts: string[] = [];
  if (staleCount    > 0) parts.push(`${staleCount} stale research item${staleCount !== 1 ? "s" : ""} (>${3}d)`);
   if (criticalCount > 0) parts.push(`${criticalCount} critical open signal${criticalCount !== 1 ? "s" : ""}`);

  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-950/20 px-4 py-3">
      <Siren size={15} className="mt-0.5 shrink-0 text-amber-400" />
      <div>
        <p className="text-xs font-bold text-amber-300">Needs Attention</p>
        <p className="mt-0.5 text-[11px] text-amber-600">{parts.join(" · ")}</p>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyWorkload() {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/5">
        <CheckCircle2 size={20} className="text-emerald-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-emerald-400">All clear</p>
        <p className="mt-0.5 text-xs text-zinc-600">No open research</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function WorkloadContent({ data }: { data: WorkloadData }) {
  const { openCount, criticalCount, staleCount, avgAgeLabel, oldestItem, items, needsAttention } = data;
  const staleItems = items.filter((i) => i.isStale);

  return (
    <>
      {/* Needs-attention banner */}
      {needsAttention && (
        <AttentionBanner staleCount={staleCount} criticalCount={criticalCount} />
      )}

      {/* Summary metrics */}
      <div className="mb-5 rounded-xl border border-zinc-800 bg-zinc-900/60">
        <StatRow
          Icon={SearchCode}
          iconClass="text-amber-400"
          label="Open Research"
          value={openCount}
          valueClass={openCount > 0 ? "text-amber-300" : "text-zinc-500"}
        />
        <StatRow
          Icon={Clock}
          iconClass="text-sky-400"
          label="Avg Research Age"
          value={avgAgeLabel}
          valueClass="text-sky-300"
        />
        <StatRow
          Icon={ShieldAlert}
          iconClass="text-red-400"
          label="Critical Unresolved"
          value={criticalCount}
          valueClass={criticalCount > 0 ? "text-red-300" : "text-zinc-600"}
        />
        {oldestItem && (
          <StatRow
            Icon={AlertTriangle}
            iconClass={oldestItem.isStale ? "text-amber-400" : "text-zinc-500"}
            label="Oldest Unresolved"
            sublabel={oldestItem.articleTitle}
            value={oldestItem.ageLabel}
            valueClass={oldestItem.isStale ? "text-amber-400" : "text-zinc-400"}
          />
        )}
      </div>

      {/* Stale items list */}
      {staleItems.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
            Stale (&gt;{3} days)
          </p>
          <div className="flex flex-col gap-2">
            {staleItems.map((item) => (
              <StaleRow key={item.articleId} item={item} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function WorkloadPanel() {
  const [data, setData]     = useState<WorkloadData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWorkloadData().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  const isEmpty = !loading && data?.openCount === 0;

  return (
    <section className="mb-12">
      {/* Section header */}
      <div className="mb-5 flex items-center gap-2.5">
        <SearchCode size={14} className="text-zinc-500" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Builder Workload
        </h2>
        <div className="flex-1 border-t border-zinc-800" />

        {/* Live badge */}
        {!loading && data?.needsAttention && (
          <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            Needs Attention
          </span>
        )}
        {!loading && !data?.needsAttention && data?.openCount === 0 && (
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-500">
            <CheckCircle2 size={10} />
            All clear
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-1">
                <div className="h-8 w-8 animate-pulse rounded-lg bg-zinc-800" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-32 animate-pulse rounded bg-zinc-800" />
                  <div className="h-2 w-20 animate-pulse rounded bg-zinc-800/60" />
                </div>
                <div className="h-4 w-10 animate-pulse rounded bg-zinc-800" />
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          <EmptyWorkload />
        ) : (
          <WorkloadContent data={data!} />
        )}
      </div>
    </section>
  );
}
