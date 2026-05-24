"use client";

import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Bookmark,
  CheckCircle2,
  Database,
  SearchCode,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { clsx } from "clsx";
import { getDashboardStats, type DashboardStats } from "@/src/lib/supabase/dashboardStats";
import { useCountUp } from "@/src/hooks/useCountUp";

// ─── Individual stat card ─────────────────────────────────────────────────────

interface StatCardProps {
  label:       string;
  sublabel:    string;
  value:       number;
  suffix?:     string;          // e.g. "/105" for average score
  Icon:        React.ElementType;
  iconBg:      string;          // icon container bg + border
  iconColor:   string;
  border:      string;
  glow:        string;
  gradient:    string;
  textColor:   string;
  featured?:   boolean;
}

function StatCard({
  label, sublabel, value, suffix,
  Icon, iconBg, iconColor, border, glow, gradient, textColor, featured,
}: StatCardProps) {
  const displayed = useCountUp(value);

  return (
    <div
      className={clsx(
        "relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5",
        "transition-all duration-300 hover:scale-[1.02]",
        border, gradient, featured && glow
      )}
    >
      {/* ambient glow blob */}
      <div
        className={clsx(
          "pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-15 blur-2xl",
          iconColor.replace("text-", "bg-")
        )}
      />

      {/* icon */}
      <div className={clsx("mb-4 flex h-9 w-9 items-center justify-center rounded-xl border", iconBg)}>
        <Icon size={17} className={iconColor} />
      </div>

      {/* value */}
      <div>
        <div className="flex items-end gap-1">
          <span className={clsx("font-mono text-4xl font-bold tabular-nums leading-none", featured ? textColor : "text-slate-100")}>
            {displayed}
          </span>
          {suffix && (
            <span className="mb-0.5 font-mono text-sm text-zinc-600">{suffix}</span>
          )}
        </div>
        <p className="mt-1.5 text-xs font-semibold uppercase tracking-widest text-zinc-400">{label}</p>
        <p className="mt-0.5 text-[10px] text-zinc-600">{sublabel}</p>
      </div>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="h-36 animate-pulse rounded-2xl border border-zinc-800 bg-zinc-900/60" />
  );
}

// ─── Dashboard section ────────────────────────────────────────────────────────

const CARD_DEFS: (Omit<StatCardProps, "value"> & { key: keyof DashboardStats })[] = [
  {
    key:       "totalThreats",
    label:     "Total Threats Seen",
    sublabel:  "all ingested articles",
    Icon:      Database,
    iconBg:    "border-slate-700 bg-slate-800/60",
    iconColor: "text-slate-400",
    border:    "border-slate-700/30",
    glow:      "",
    gradient:  "bg-gradient-to-br from-slate-900/60 via-zinc-900 to-zinc-900",
    textColor: "text-slate-300",
    featured:  false,
  },
  {
    key:       "criticalThreats",
    label:     "Critical Threats",
    sublabel:  "threat score ≥ 90",
    Icon:      ShieldAlert,
    iconBg:    "border-red-500/30 bg-red-950/60",
    iconColor: "text-red-400",
    border:    "border-red-500/20",
    glow:      "shadow-[0_0_28px_-6px_rgba(239,68,68,0.35)]",
    gradient:  "bg-gradient-to-br from-red-950/40 via-zinc-900 to-zinc-900",
    textColor: "text-red-300",
    featured:  true,
  },
  {
    key:       "avgThreatScore",
    label:     "Avg Threat Score",
    sublabel:  "mean across all articles",
    suffix:    "/105",
    Icon:      TrendingUp,
    iconBg:    "border-orange-500/30 bg-orange-950/60",
    iconColor: "text-orange-400",
    border:    "border-orange-500/20",
    glow:      "shadow-[0_0_24px_-6px_rgba(249,115,22,0.3)]",
    gradient:  "bg-gradient-to-br from-orange-950/30 via-zinc-900 to-zinc-900",
    textColor: "text-orange-300",
    featured:  true,
  },
  {
    key:       "openInvestigations",
    label:     "Open Investigations",
    sublabel:  "status: investigating",
    Icon:      SearchCode,
    iconBg:    "border-amber-500/30 bg-amber-950/60",
    iconColor: "text-amber-400",
    border:    "border-amber-500/20",
    glow:      "shadow-[0_0_24px_-6px_rgba(245,158,11,0.3)]",
    gradient:  "bg-gradient-to-br from-amber-950/30 via-zinc-900 to-zinc-900",
    textColor: "text-amber-300",
    featured:  true,
  },
  {
    key:       "reviewedToday",
    label:     "Reviewed Today",
    sublabel:  "closed since midnight",
    Icon:      CheckCircle2,
    iconBg:    "border-emerald-500/30 bg-emerald-950/60",
    iconColor: "text-emerald-400",
    border:    "border-emerald-500/20",
    glow:      "shadow-[0_0_24px_-6px_rgba(52,211,153,0.3)]",
    gradient:  "bg-gradient-to-br from-emerald-950/30 via-zinc-900 to-zinc-900",
    textColor: "text-emerald-300",
    featured:  true,
  },
  {
    key:       "savedItems",
    label:     "Saved Items",
    sublabel:  "on watchlist",
    Icon:      Bookmark,
    iconBg:    "border-cyan-500/30 bg-cyan-950/60",
    iconColor: "text-cyan-400",
    border:    "border-cyan-500/20",
    glow:      "shadow-[0_0_24px_-6px_rgba(34,211,238,0.3)]",
    gradient:  "bg-gradient-to-br from-cyan-950/30 via-zinc-900 to-zinc-900",
    textColor: "text-cyan-300",
    featured:  true,
  },
];

export default function DashboardSection() {
  const [stats, setStats]   = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then((s) => {
      setStats(s);
      setLoading(false);
    });
  }, []);

  return (
    <section className="mb-12">
      {/* Section header */}
      <div className="mb-5 flex items-center gap-2.5">
        <Activity size={14} className="text-zinc-500" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Intelligence Overview
        </h2>
        <div className="flex-1 border-t border-zinc-800" />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {loading
          ? [...Array(6)].map((_, i) => <SkeletonCard key={i} />)
          : CARD_DEFS.map(({ key, ...def }) => (
              <StatCard
                key={key}
                {...def}
                value={stats?.[key] ?? 0}
              />
            ))}
      </div>
    </section>
  );
}
