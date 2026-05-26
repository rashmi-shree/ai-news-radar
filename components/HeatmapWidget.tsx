"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Grid2x2 } from "lucide-react";
import { clsx } from "clsx";
import { getHeatmapData, type HeatmapData } from "@/src/lib/supabase/analyticsData";

// ─── Risk row config ──────────────────────────────────────────────────────────

const RISK_CFG = {
  High:   { label: "High",   hue: "34, 211, 238",  // cyan-400
             badge: "border-red-500/30 bg-red-500/10 text-red-400" },
  Medium: { label: "Medium", hue: "251, 191, 36",   // amber-400
             badge: "border-amber-500/30 bg-amber-500/10 text-amber-400" },
  Low:    { label: "Low",    hue: "52, 211, 153",   // emerald-400
             badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" },
} as const;

// ─── Cell colour ──────────────────────────────────────────────────────────────

/** Returns an rgba string with opacity proportional to count / maxCount. */
function cellColor(
  count: number,
  maxCount: number,
  hue: string        // "r, g, b"
): string {
  if (count === 0 || maxCount === 0) return "transparent";
  // Scale from 0.10 (faintest non-zero) to 0.88 (brightest)
  const intensity = 0.1 + (count / maxCount) * 0.78;
  return `rgba(${hue}, ${intensity.toFixed(3)})`;
}

/** Text colour: white above 50% intensity, muted below. */
function cellTextClass(count: number, maxCount: number): string {
  if (count === 0) return "text-zinc-800";
  return count / maxCount > 0.5 ? "text-white" : "text-zinc-300";
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

interface TooltipState {
  visible:  boolean;
  x:        number;
  y:        number;
  risk:     string;
  category: string;
  count:    number;
}

// ─── Heatmap grid ─────────────────────────────────────────────────────────────

function HeatGrid({ data }: { data: HeatmapData }) {
  const { categories, riskLevels, grid, maxCount } = data;
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, risk: "", category: "", count: 0,
  });
  const containerRef = useRef<HTMLDivElement>(null);

  function handleEnter(
    e: React.MouseEvent,
    risk: string,
    category: string,
    count: number
  ) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({
      visible:  true,
      x:        e.clientX - rect.left,
      y:        e.clientY - rect.top,
      risk,
      category,
      count,
    });
  }

  const Y_LABEL_W = 80; // px — fixed left column
  const CELL_H    = 52; // px

  return (
    <div ref={containerRef} className="relative select-none">

      {/* ── Column headers (categories) ── */}
      <div
        className="mb-1 flex"
        style={{ paddingLeft: Y_LABEL_W }}
      >
        {categories.map((cat) => (
          <div
            key={cat}
            className="flex-1 px-1 text-center"
            style={{ minWidth: 0 }}
          >
            <span
              className="block truncate text-center font-mono text-[9px] font-semibold uppercase tracking-widest text-zinc-600"
              title={cat}
            >
              {cat.length > 10 ? cat.replace("Intelligence", "Intel").replace("Security", "Sec").replace("Kubernetes", "K8s") : cat}
            </span>
          </div>
        ))}
      </div>

      {/* ── Grid rows ── */}
      {riskLevels.map((risk) => {
        const cfg = RISK_CFG[risk];
        return (
          <div key={risk} className="flex items-center" style={{ height: CELL_H }}>

            {/* Y label */}
            <div
              className="flex shrink-0 items-center justify-end pr-3"
              style={{ width: Y_LABEL_W }}
            >
              <span
                className={clsx(
                  "rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest",
                  cfg.badge
                )}
              >
                {cfg.label}
              </span>
            </div>

            {/* Cells */}
            {categories.map((cat) => {
              const count = grid[risk]?.[cat] ?? 0;
              const bg    = cellColor(count, maxCount, cfg.hue);
              const textClass = cellTextClass(count, maxCount);

              return (
                <div
                  key={cat}
                  className="group relative flex-1 cursor-default"
                  style={{ minWidth: 0, height: CELL_H, padding: 2 }}
                  onMouseEnter={(e) => handleEnter(e, risk, cat, count)}
                  onMouseLeave={() => setTooltip((t) => ({ ...t, visible: false }))}
                >
                  <div
                    className={clsx(
                      "flex h-full w-full items-center justify-center rounded-lg",
                      "border border-zinc-800/60 transition-all duration-150",
                      "group-hover:border-zinc-600 group-hover:scale-105",
                      count === 0 ? "bg-zinc-900/40" : ""
                    )}
                    style={count > 0 ? { background: bg } : undefined}
                  >
                    <span className={clsx("font-mono text-sm font-bold tabular-nums", textClass)}>
                      {count > 0 ? count : "·"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      {/* ── Tooltip ── */}
      {tooltip.visible && (
        <div
          className="pointer-events-none absolute z-20 w-max max-w-[200px] rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl"
          style={{
            left: Math.min(
              tooltip.x + 12,
              (containerRef.current?.offsetWidth ?? 9999) - 212
            ),
            top: tooltip.y - 10,
          }}
        >
          <p className="font-mono text-[10px] text-zinc-500">
            {tooltip.category} · <span className="uppercase">{tooltip.risk}</span>
          </p>
          <p className="mt-0.5 font-mono text-sm font-bold text-slate-200">
            {tooltip.count}{" "}
            <span className="font-normal text-zinc-500">
              signal{tooltip.count !== 1 ? "s" : ""}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Intensity legend ─────────────────────────────────────────────────────────

function IntensityLegend({ maxCount }: { maxCount: number }) {
  const steps = 5;
  return (
    <div className="mt-5 flex items-center gap-3">
      <span className="text-[10px] text-zinc-700">Low</span>
      <div className="flex gap-1">
        {Array.from({ length: steps }, (_, i) => {
          const frac = (i + 1) / steps;
          const opacity = (0.1 + frac * 0.78).toFixed(2);
          return (
            <div
              key={i}
              className="h-3 w-6 rounded-sm"
              style={{ background: `rgba(34, 211, 238, ${opacity})` }}
              title={`${Math.round(frac * maxCount)} signals`}
            />
          );
        })}
      </div>
      <span className="text-[10px] text-zinc-700">High</span>
      <span className="ml-2 font-mono text-[10px] text-zinc-600">max {maxCount}</span>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="space-y-2">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-2">
          <div className="h-12 w-20 animate-pulse rounded-lg bg-zinc-800" />
          {[...Array(6)].map((_, j) => (
            <div
              key={j}
              className="h-12 flex-1 animate-pulse rounded-lg bg-zinc-800/60"
              style={{ animationDelay: `${(i * 6 + j) * 40}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function HeatmapWidget() {
  const { userId } = useAuth();
  const [data, setData]     = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getHeatmapData(userId).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [userId]);

  const isEmpty = !loading && (!data?.categories.length);

  return (
    <section className="mb-12">
      {/* Section header */}
      <div className="mb-5 flex items-center gap-2.5">
        <Grid2x2 size={14} className="text-zinc-500" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Activity Heatmap
        </h2>
        <div className="flex-1 border-t border-zinc-800" />
        <span className="text-[10px] text-zinc-700">category × risk level</span>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
        {/* Sub-header */}
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Signal Density
            </p>
            <p className="mt-0.5 text-[10px] text-zinc-700">
              articles per category-risk intersection
            </p>
          </div>
          {/* Risk legend pills */}
          <div className="flex items-center gap-2">
            {(["High", "Medium", "Low"] as const).map((r) => (
              <span
                key={r}
                className={clsx(
                  "rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest",
                  RISK_CFG[r].badge
                )}
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        {loading    ? <SkeletonGrid /> :
         isEmpty    ? (
           <div className="flex h-32 items-center justify-center text-xs text-zinc-700">
             No article data yet
           </div>
         ) : (
           <>
             <div className="overflow-x-auto">
               <div className="min-w-[540px]">
                 <HeatGrid data={data!} />
               </div>
             </div>
             <IntensityLegend maxCount={data!.maxCount} />
           </>
         )}
      </div>
    </section>
  );
}
