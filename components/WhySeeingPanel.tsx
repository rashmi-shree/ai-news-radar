"use client";

import { useState } from "react";
import {
  Bookmark,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flame,
  HelpCircle,
  Hammer,
  Loader2,
  Megaphone,
  Microscope,
  Radar,
  SearchCode,
  Star,
  TrendingUp,
  Wrench,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import type { WhyReason, ScoreBar, WhyResponse } from "@/app/api/article/why/route";

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICONS: Record<string, React.ElementType> = {
  Flame, TrendingUp, Hammer, Megaphone, Microscope,
  Zap, Bookmark, SearchCode, CheckCircle2, Star,
  Wrench, Radar,
};

// ─── Type colors ──────────────────────────────────────────────────────────────

const TYPE_ACCENT: Record<string, string> = {
  score:    "text-amber-400",
  behavior: "text-violet-400",
  interest: "text-cyan-400",
  tool:     "text-emerald-400",
};

const TYPE_PILL: Record<string, string> = {
  score:    "border-amber-500/30 bg-amber-500/8 text-amber-300",
  behavior: "border-violet-500/30 bg-violet-500/8 text-violet-300",
  interest: "border-cyan-500/30 bg-cyan-500/8 text-cyan-300",
  tool:     "border-emerald-500/30 bg-emerald-500/8 text-emerald-300",
};

const STRENGTH_OPACITY: Record<string, string> = {
  strong:   "opacity-100",
  moderate: "opacity-80",
  weak:     "opacity-55",
};

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBarRow({ bar }: { bar: ScoreBar }) {
  const pct = bar.max > 0 ? Math.min((bar.value / bar.max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-[11px] text-zinc-500 sm:w-36">{bar.label}</span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={clsx("absolute inset-y-0 left-0 rounded-full transition-all", bar.color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 shrink-0 text-right font-mono text-[11px] text-zinc-500">
        {bar.value}
      </span>
    </div>
  );
}

// ─── Reason pill ──────────────────────────────────────────────────────────────

function ReasonPill({ reason }: { reason: WhyReason }) {
  const Icon = ICONS[reason.icon] ?? Radar;
  const accent = TYPE_ACCENT[reason.type] ?? "text-zinc-400";
  const pill   = TYPE_PILL[reason.type]   ?? "border-zinc-700 bg-zinc-800 text-zinc-400";

  return (
    <div className={clsx("group relative", STRENGTH_OPACITY[reason.strength])}>
      <div className={clsx(
        "flex items-center gap-2 rounded-lg border px-3 py-2.5",
        pill
      )}>
        <Icon size={13} className={accent} />
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-tight">{reason.label}</p>
          {reason.detail && (
            <p className="mt-0.5 text-[10px] leading-snug opacity-70">{reason.detail}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r    = 20;
  const circ = 2 * Math.PI * r;
  const pct  = Math.min(score / 125, 1);
  const dash = pct * circ;

  const color =
    score >= 90 ? "#f43f5e"
    : score >= 70 ? "#f59e0b"
    : score >= 40 ? "#06b6d4"
    : "#52525b";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r={r} fill="none" stroke="#27272a" strokeWidth="4" />
        <circle
          cx="26" cy="26" r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 26 26)"
        />
        <text x="26" y="31" textAnchor="middle" fontSize="12" fontWeight="700" fill={color}>
          {score}
        </text>
      </svg>
      <span className="text-[9px] uppercase tracking-widest text-zinc-600">Build Score</span>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type State = "idle" | "loading" | "ready" | "error";

export default function WhySeeingPanel({ articleId }: { articleId: string }) {
  const [open,  setOpen]  = useState(false);
  const [state, setState] = useState<State>("idle");
  const [data,  setData]  = useState<WhyResponse | null>(null);

  async function handleOpen() {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (data) return; // already loaded

    setState("loading");
    try {
      const res  = await fetch(`/api/article/why?articleId=${encodeURIComponent(articleId)}`);
      const json = await res.json() as { ok: boolean } & WhyResponse;
      if (json.ok) { setData(json); setState("ready"); }
      else setState("error");
    } catch { setState("error"); }
  }

  const behaviorReasons  = data?.reasons.filter((r) => r.type === "behavior")  ?? [];
  const interestReasons  = data?.reasons.filter((r) => r.type === "interest")  ?? [];
  const toolReasons      = data?.reasons.filter((r) => r.type === "tool")      ?? [];
  const scoreReasons     = data?.reasons.filter((r) => r.type === "score")     ?? [];

  return (
    <div className="border-t border-zinc-800/60">
      {/* ── Toggle button ── */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex w-full items-center justify-between px-1 py-2.5 text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <span className="flex items-center gap-1.5">
          <HelpCircle size={12} />
          Why am I seeing this?
        </span>
        {state === "loading"
          ? <Loader2 size={11} className="animate-spin text-zinc-600" />
          : open
          ? <ChevronUp   size={11} />
          : <ChevronDown size={11} />}
      </button>

      {/* ── Panel ── */}
      {open && (
        <div className="mb-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/80">

          {/* Loading */}
          {state === "loading" && (
            <div className="flex h-20 items-center justify-center gap-2 text-xs text-zinc-600">
              <Loader2 size={13} className="animate-spin" />
              Analysing…
            </div>
          )}

          {/* Error */}
          {state === "error" && (
            <p className="p-4 text-xs text-zinc-600">Could not load explanation.</p>
          )}

          {/* Ready */}
          {state === "ready" && data && (
            <div className="p-4">

              {/* Header row: score ring + reasons summary */}
              <div className="mb-4 flex items-start gap-4">
                <ScoreRing score={data.builderScore} />
                <div className="flex-1">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                    Surfacing reasons
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {data.reasons.map((r) => (
                      <div
                        key={r.id}
                        className={clsx(
                          "flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium",
                          TYPE_PILL[r.type] ?? "border-zinc-700 bg-zinc-800 text-zinc-400"
                        )}
                      >
                        {(() => { const Icon = ICONS[r.icon] ?? Radar; return <Icon size={9} />; })()}
                        {r.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Grouped reason cards */}
              {[
                { label: "Your interests",   reasons: interestReasons,  accent: "text-cyan-500"    },
                { label: "Your tools",        reasons: toolReasons,      accent: "text-emerald-500" },
                { label: "Your history",      reasons: behaviorReasons,  accent: "text-violet-500"  },
                { label: "Score signals",     reasons: scoreReasons,     accent: "text-amber-500"   },
              ].filter((g) => g.reasons.length > 0).map((group) => (
                <div key={group.label} className="mb-4">
                  <p className={clsx("mb-2 text-[9px] font-semibold uppercase tracking-widest", group.accent)}>
                    {group.label}
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {group.reasons.map((r) => <ReasonPill key={r.id} reason={r} />)}
                  </div>
                </div>
              ))}

              {/* Score breakdown bars */}
              <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-3">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  Score breakdown
                </p>
                <div className="flex flex-col gap-2">
                  {data.scoreBars.map((bar) => (
                    <ScoreBarRow key={bar.key} bar={bar} />
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-2">
                  <span className="text-[10px] text-zinc-600">Build Score</span>
                  <span className={clsx(
                    "font-mono text-sm font-bold",
                    data.builderScore >= 90 ? "text-rose-400"
                    : data.builderScore >= 70 ? "text-amber-400"
                    : data.builderScore >= 40 ? "text-cyan-400"
                    : "text-zinc-500"
                  )}>
                    {data.builderScore}
                  </span>
                </div>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}
