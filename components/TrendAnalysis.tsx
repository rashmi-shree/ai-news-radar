"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import { clsx } from "clsx";
import { getTrendData, type PeriodTrend, type TrendMetric } from "@/src/lib/supabase/trendAnalysis";

// ─── Trend badge ──────────────────────────────────────────────────────────────

function TrendBadge({ metric }: { metric: TrendMetric }) {
  const { direction, change, sentiment, current, previous } = metric;

  // If both periods are zero — no data
  if (current === 0 && previous === 0) {
    return (
      <span className="flex items-center gap-1 font-mono text-xs text-zinc-700">
        <Minus size={11} />
        <span>—</span>
      </span>
    );
  }

  // First occurrence in current period (no history yet)
  if (previous === 0 && current > 0) {
    return (
      <span className="font-mono text-[10px] font-semibold text-cyan-500 uppercase tracking-wider">
        NEW
      </span>
    );
  }

  const isUp   = direction === "up";
  const isDown = direction === "down";
  const isFlat = direction === "flat";

  // Colour logic: for "bad" metrics (signals), up=red down=green
  //               for "neutral" metrics (investigations), up=amber down=zinc
  const color = isFlat
    ? "text-zinc-600"
    : sentiment === "bad"
    ? isUp   ? "text-red-400"   : "text-emerald-400"
    : isUp   ? "text-amber-400" : "text-zinc-500";

  const Arrow = isUp ? TrendingUp : isDown ? TrendingDown : Minus;

  return (
    <span className={clsx("flex items-center gap-1 font-mono text-xs font-bold", color)}>
      <Arrow size={12} />
      <span>
        {isFlat ? "0%" : `${isUp ? "+" : ""}${change}%`}
      </span>
    </span>
  );
}

// ─── Single metric row ────────────────────────────────────────────────────────

function MetricRow({ metric }: { metric: TrendMetric }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-zinc-800/60 last:border-0">
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-zinc-300 truncate">{metric.label}</p>
        <p className="font-mono text-[10px] text-zinc-600">
          {metric.current}
          {metric.previous > 0 && (
            <span className="ml-1 text-zinc-700">vs {metric.previous}</span>
          )}
        </p>
      </div>
      <TrendBadge metric={metric} />
    </div>
  );
}

// ─── Period card ──────────────────────────────────────────────────────────────

function PeriodCard({ period }: { period: PeriodTrend }) {
  const { newThreats, criticalThreats, investigations } = period.metrics;

  // Overall card accent — red if critical is up, amber if investigations up, else neutral
  const hasCritUp  = criticalThreats.direction === "up" && criticalThreats.current > 0;
  const hasInvUp   = investigations.direction  === "up" && investigations.current  > 0;

  const borderClass = hasCritUp
    ? "border-red-500/20"
    : hasInvUp
    ? "border-amber-500/15"
    : "border-zinc-800";

  const topAccent = hasCritUp
    ? "bg-red-500"
    : hasInvUp
    ? "bg-amber-500"
    : "bg-zinc-700";

  return (
    <div className={clsx("relative overflow-hidden rounded-2xl border bg-zinc-900/70 p-5", borderClass)}>
      {/* Top accent line */}
      <div className={clsx("absolute inset-x-0 top-0 h-0.5", topAccent)} />

      {/* Period label */}
      <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        {period.label}
      </p>

      {/* Metric rows */}
      <MetricRow metric={newThreats} />
      <MetricRow metric={criticalThreats} />
      <MetricRow metric={investigations} />
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function PeriodSkeleton() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
      <div className="mb-4 h-2.5 w-20 animate-pulse rounded bg-zinc-800" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex items-center justify-between border-b border-zinc-800/60 py-2.5 last:border-0">
          <div className="space-y-1.5">
            <div className="h-2.5 w-28 animate-pulse rounded bg-zinc-800" />
            <div className="h-2 w-10 animate-pulse rounded bg-zinc-800/60" />
          </div>
          <div className="h-3.5 w-12 animate-pulse rounded bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function TrendAnalysis() {
  const [trends, setTrends]   = useState<PeriodTrend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrendData().then((t) => {
      setTrends(t);
      setLoading(false);
    });
  }, []);

  return (
    <section className="mb-12">
      {/* Section header */}
      <div className="mb-5 flex items-center gap-2.5">
        <Activity size={14} className="text-zinc-500" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Builder Trends
        </h2>
        <div className="flex-1 border-t border-zinc-800" />
        <span className="text-[10px] text-zinc-700">period-over-period</span>
      </div>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-4">
        {[
          { label: "Signals up",           color: "text-red-400",     Icon: TrendingUp   },
          { label: "Signals down",         color: "text-emerald-400", Icon: TrendingDown },
          { label: "Research up",          color: "text-amber-400",   Icon: TrendingUp   },
        ].map(({ label, color, Icon }) => (
          <span key={label} className={clsx("flex items-center gap-1.5 text-[10px]", color)}>
            <Icon size={10} />
            <span className="text-zinc-600">{label}</span>
          </span>
        ))}
      </div>

      {/* Period cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {loading
          ? [...Array(3)].map((_, i) => <PeriodSkeleton key={i} />)
          : trends.map((p) => <PeriodCard key={p.label} period={p} />)
        }
      </div>
    </section>
  );
}
