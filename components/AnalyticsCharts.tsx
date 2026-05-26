"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { BarChart2 } from "lucide-react";
import { getAnalyticsData, type AnalyticsData } from "@/src/lib/supabase/analyticsData";

// ─── Shared chart theme values ────────────────────────────────────────────────

const AXIS_STYLE  = { fill: "#71717a", fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)" };
const GRID_COLOR  = "#27272a"; // zinc-800
const PANEL_CLASS = "rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5";

// ─── Dark tooltip ─────────────────────────────────────────────────────────────

function DarkTooltip({
  active,
  payload,
  label,
  valueLabel = "count",
}: {
  active?: boolean;
  payload?: { value: number; fill?: string; name?: string; payload?: { fill?: string } }[];
  label?: string;
  valueLabel?: string;
}) {
  if (!active || !payload?.length) return null;
  const { value } = payload[0];
  const fill = payload[0].payload?.fill ?? payload[0].fill ?? "#71717a";

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl">
      {label && <p className="mb-0.5 font-mono text-[10px] text-zinc-500">{label}</p>}
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: fill }} />
        <span className="font-mono text-xs font-bold text-slate-200">
          {value}
          <span className="ml-1 font-normal text-zinc-500">{valueLabel}</span>
        </span>
      </div>
    </div>
  );
}

// ─── Pie tooltip ──────────────────────────────────────────────────────────────

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { fill: string } }[];
}) {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 shadow-xl">
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: p.fill }} />
        <span className="font-mono text-xs text-zinc-400">{name}</span>
        <span className="font-mono text-xs font-bold text-slate-200">{value}</span>
      </div>
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function ChartSkeleton({ title }: { title: string }) {
  return (
    <div className={PANEL_CLASS}>
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{title}</p>
      <div className="h-44 animate-pulse rounded-xl bg-zinc-800/60" />
    </div>
  );
}

// ─── 1. Build Score Distribution (vertical bar) ───────────────────────────────

function ScoreDistributionChart({ data }: { data: AnalyticsData["scoreDistribution"] }) {
  const isEmpty = data.every((b) => b.count === 0);

  return (
    <div className={PANEL_CLASS}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        Build Score Distribution
      </p>
      <p className="mb-5 text-[10px] text-zinc-700">articles by score range</p>

      {isEmpty ? (
        <div className="flex h-[180px] items-center justify-center">
          <p className="text-xs text-zinc-600">No scored articles yet</p>
        </div>
      ) : null}

      <ResponsiveContainer width="100%" height={isEmpty ? 0 : 180}>
        <BarChart data={data} barCategoryGap="28%" margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
          <XAxis dataKey="range" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
          <YAxis
            tick={AXIS_STYLE}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: GRID_COLOR }}
            content={<DarkTooltip valueLabel="articles" />}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={56}>
            {data.map((entry) => (
              <Cell key={entry.range} fill={entry.fill} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend row */}
      <div className="mt-4 flex flex-wrap gap-3">
        {data.map((b) => (
          <span key={b.range} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
            <span className="h-2 w-2 rounded-sm" style={{ background: b.fill }} />
            {b.range}
            <span className="font-mono text-zinc-400">{b.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── 2. Status Breakdown (donut pie) ─────────────────────────────────────────

const RADIAN = Math.PI / 180;

function PieLabel({
  cx, cy, midAngle, innerRadius, outerRadius, percent,
}: {
  cx?: number; cy?: number; midAngle?: number;
  innerRadius?: number; outerRadius?: number; percent?: number;
}) {
  if (cx == null || cy == null || midAngle == null || innerRadius == null || outerRadius == null || percent == null) return null;
  if (percent < 0.05) return null; // skip tiny slices
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const angle  = midAngle;
  const x = cx + radius * Math.cos(-angle * RADIAN);
  const y = cy + radius * Math.sin(-angle * RADIAN);
  return (
    <text
      x={x} y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      style={{ fontSize: 11, fontFamily: "var(--font-geist-mono, monospace)", fontWeight: 700 }}
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

function StatusDonutChart({ data }: { data: AnalyticsData["statusBreakdown"] }) {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className={PANEL_CLASS}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        Status Breakdown
      </p>
      <p className="mb-3 text-[10px] text-zinc-700">tracked articles by builder status</p>

      {total === 0 ? (
        <div className="flex h-44 items-center justify-center text-xs text-zinc-700">
          No tracked articles yet
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          {/* Donut */}
          <ResponsiveContainer width="100%" height={180} className="sm:w-[60%] sm:flex-none">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={48}
                outerRadius={80}
                paddingAngle={3}
                labelLine={false}
                label={PieLabel}
              >
                {data.map((entry) => (
                  <Cell key={entry.status} fill={entry.fill} fillOpacity={0.9} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend with counts */}
          <div className="flex flex-col gap-2.5">
            {data.map((s) => (
              <div key={s.status} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: s.fill }}
                />
                <span className="text-[11px] text-zinc-400">{s.label}</span>
                <span className="ml-auto font-mono text-[11px] font-bold text-slate-300">
                  {s.count}
                </span>
              </div>
            ))}
            <div className="mt-1 border-t border-zinc-800 pt-1.5 flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">Total</span>
              <span className="ml-auto font-mono text-xs font-bold text-slate-400">{total}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 3. Category Breakdown (horizontal bars) ──────────────────────────────────

function CategoryChart({ data }: { data: AnalyticsData["categoryBreakdown"] }) {
  // Recharts horizontal bar uses layout="vertical" + XAxis as value axis
  return (
    <div className={PANEL_CLASS}>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        Category Breakdown
      </p>
      <p className="mb-5 text-[10px] text-zinc-700">articles by intelligence category</p>

      {data.length === 0 ? (
        <div className="flex h-44 items-center justify-center text-xs text-zinc-700">
          No data yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(160, data.length * 32)}>
          <BarChart
            data={data}
            layout="vertical"
            barCategoryGap="22%"
            margin={{ top: 0, right: 32, bottom: 0, left: 0 }}
          >
            <XAxis
              type="number"
              tick={AXIS_STYLE}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="category"
              width={116}
              tick={{ ...AXIS_STYLE, textAnchor: "end" }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: GRID_COLOR }}
              content={<DarkTooltip valueLabel="articles" />}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={18}>
              {data.map((entry) => (
                <Cell key={entry.category} fill={entry.fill} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function AnalyticsCharts() {
  const [data, setData]     = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalyticsData().then((d) => {
      setData(d);
      setLoading(false);
    });
  }, []);

  return (
    <section className="mb-12">
      {/* Section header */}
      <div className="mb-5 flex items-center gap-2.5">
        <BarChart2 size={14} className="text-zinc-500" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Analytics
        </h2>
        <div className="flex-1 border-t border-zinc-800" />
      </div>

      {/* 3-column chart grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <>
            <ChartSkeleton title="Build Score Distribution" />
            <ChartSkeleton title="Status Breakdown" />
            <ChartSkeleton title="Category Breakdown" />
          </>
        ) : (
          <>
            <ScoreDistributionChart data={data!.scoreDistribution} />
            <StatusDonutChart      data={data!.statusBreakdown} />
            <CategoryChart         data={data!.categoryBreakdown} />
          </>
        )}
      </div>
    </section>
  );
}
