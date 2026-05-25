"use client";

import { useState } from "react";
import {
  Activity,
  Brain,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Lightbulb,
  Hammer,
  Tag,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import type { ScoreComponents } from "@/src/lib/recommendation/feedScoring";

// ─── Score row ────────────────────────────────────────────────────────────────

function ScoreRow({
  icon,
  label,
  value,
  accent,
  sub,
}: {
  icon:   React.ReactNode;
  label:  string;
  value:  number;
  accent: string;
  sub?:   React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={clsx("shrink-0", accent)}>{icon}</span>
          <span className="text-xs text-zinc-300">{label}</span>
        </div>
        <span className={clsx(
          "font-mono text-xs font-bold",
          value > 0 ? accent : value < 0 ? "text-red-400" : "text-zinc-600"
        )}>
          {value > 0 ? `+${value}` : value === 0 ? "—" : value}
        </span>
      </div>
      {sub && <div className="ml-6">{sub}</div>}
    </div>
  );
}

// ─── Tag pill ─────────────────────────────────────────────────────────────────

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium", color)}>
      {children}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  components: ScoreComponents;
}

export default function WhyThisCard({ components }: Props) {
  const [open, setOpen] = useState(false);

  const {
    builderScore,
    interestScore,
    behaviorScore,
    freshnessBonus,
    finalScore,
    matchedTopics,
    behaviorReasons,
  } = components;

  const hasSignal = interestScore > 0 || behaviorScore !== 0 || matchedTopics.length > 0;

  return (
    <div className="border-t border-zinc-800/60">
      {/* ── Toggle button ── */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="flex w-full items-center justify-between px-1 py-2 text-[10px] font-medium text-zinc-600 transition-colors hover:text-zinc-400"
      >
        <span className="flex items-center gap-1.5">
          <HelpCircle size={11} />
          Why am I seeing this?
        </span>
        {open
          ? <ChevronUp  size={11} />
          : <ChevronDown size={11} />}
      </button>

      {/* ── Drawer ── */}
      {open && (
        <div
          className="mb-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/80"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2.5">
            <Brain size={13} className="text-cyan-500" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Ranking signals
            </span>
          </div>

          {/* Score rows */}
          <div className="space-y-3 px-4 py-3">

            {/* Builder score */}
            <ScoreRow
              icon={<Hammer size={13} />}
              label="Build score"
              value={builderScore}
              accent="text-amber-400"
            />

            {/* Interest match */}
            <ScoreRow
              icon={<Lightbulb size={13} />}
              label="Interest match"
              value={interestScore}
              accent="text-cyan-400"
              sub={
                matchedTopics.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {matchedTopics.map((t) => (
                      <Pill key={t} color="border-cyan-500/30 bg-cyan-500/8 text-cyan-400">
                        <Tag size={8} />
                        {t}
                      </Pill>
                    ))}
                  </div>
                ) : interestScore === 0 ? (
                  <span className="text-[10px] text-zinc-700">No topic overlap</span>
                ) : null
              }
            />

            {/* Behavior boost */}
            <ScoreRow
              icon={<Activity size={13} />}
              label="Behavior boost"
              value={behaviorScore}
              accent={behaviorScore >= 0 ? "text-violet-400" : "text-red-400"}
              sub={
                behaviorReasons.length > 0 ? (
                  <ul className="space-y-0.5">
                    {behaviorReasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[10px] text-zinc-500">
                        <span className="mt-px text-violet-600">›</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                ) : behaviorScore === 0 ? (
                  <span className="text-[10px] text-zinc-700">No behavior signal yet</span>
                ) : null
              }
            />

            {/* Freshness */}
            <ScoreRow
              icon={<Zap size={13} />}
              label="Freshness bonus"
              value={freshnessBonus}
              accent="text-emerald-400"
            />

            {/* Divider + final score */}
            <div className="border-t border-zinc-800 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Final score</span>
                <span className={clsx(
                  "font-mono text-sm font-bold",
                  finalScore >= 90 ? "text-rose-400"
                  : finalScore >= 70 ? "text-amber-400"
                  : finalScore >= 40 ? "text-cyan-400"
                  : "text-zinc-400"
                )}>
                  {finalScore}
                </span>
              </div>

              {/* Bar */}
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={clsx(
                    "h-full rounded-full transition-all",
                    finalScore >= 90 ? "bg-rose-500"
                    : finalScore >= 70 ? "bg-amber-500"
                    : finalScore >= 40 ? "bg-cyan-500"
                    : "bg-zinc-600"
                  )}
                  style={{ width: `${Math.min((finalScore / 130) * 100, 100)}%` }}
                />
              </div>

              {/* Breakdown formula */}
              <p className="mt-2 font-mono text-[9px] text-zinc-700">
                {builderScore} build
                {interestScore !== 0 && ` + ${interestScore} interest`}
                {behaviorScore !== 0 && ` ${behaviorScore > 0 ? "+" : ""}${behaviorScore} behavior`}
                {freshnessBonus !== 0 && ` + ${freshnessBonus} fresh`}
                {" = "}
                <span className="text-zinc-500">{finalScore}</span>
              </p>
            </div>

            {/* No signal notice */}
            {!hasSignal && (
              <p className="text-[10px] text-zinc-700">
                Ranked by build score only — interact with articles to personalise this further.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
