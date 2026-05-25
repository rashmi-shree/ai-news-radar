"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FlaskConical,
  Hammer,
  Lightbulb,
  Loader2,
  RefreshCw,
  Sparkles,
  Wrench,
} from "lucide-react";
import { clsx } from "clsx";
import type { ResearchBrief } from "@/src/lib/ai/research";

// ─── Tab config ───────────────────────────────────────────────────────────────

type TabKey = "what_happened" | "why_builders_care" | "use_cases" | "risks" | "time_to_learn";

interface TabDef {
  key:     TabKey;
  label:   string;
  icon:    React.ElementType;
  accent:  string;
  chipBg:  string;
}

const TABS: TabDef[] = [
  {
    key:    "what_happened",
    label:  "What Happened",
    icon:   Sparkles,
    accent: "text-sky-400",
    chipBg: "border-sky-500/30 bg-sky-500/8 text-sky-300",
  },
  {
    key:    "why_builders_care",
    label:  "Why Builders Care",
    icon:   Hammer,
    accent: "text-amber-400",
    chipBg: "border-amber-500/30 bg-amber-500/8 text-amber-300",
  },
  {
    key:    "use_cases",
    label:  "Use Cases",
    icon:   Wrench,
    accent: "text-emerald-400",
    chipBg: "border-emerald-500/30 bg-emerald-500/8 text-emerald-300",
  },
  {
    key:    "risks",
    label:  "Risks",
    icon:   AlertTriangle,
    accent: "text-rose-400",
    chipBg: "border-rose-500/30 bg-rose-500/8 text-rose-300",
  },
  {
    key:    "time_to_learn",
    label:  "Time to Learn",
    icon:   Clock,
    accent: "text-violet-400",
    chipBg: "border-violet-500/30 bg-violet-500/8 text-violet-300",
  },
];

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchBrief(articleId: string): Promise<ResearchBrief | null> {
  const res = await fetch(`/api/article/research?id=${encodeURIComponent(articleId)}`);
  if (!res.ok) return null;
  const json = await res.json() as { ok: boolean; brief: ResearchBrief | null };
  return json.ok ? json.brief : null;
}

async function generateBrief(articleId: string): Promise<ResearchBrief | null> {
  const res = await fetch("/api/article/research", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ articleId }),
  });
  if (!res.ok) return null;
  const json = await res.json() as { ok: boolean; brief: ResearchBrief | null };
  return json.ok ? json.brief : null;
}

// ─── Tab content ──────────────────────────────────────────────────────────────

function BriefContent({ tab, brief }: { tab: TabDef; brief: ResearchBrief }) {
  const value = brief[tab.key];
  const TabIcon = tab.icon;

  if (tab.key === "use_cases" || tab.key === "risks") {
    const items = value as string[];
    const isRisk = tab.key === "risks";
    return (
      <ul className="flex flex-col gap-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              className={clsx(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-bold",
                isRisk
                  ? "border-rose-500/40 bg-rose-500/10 text-rose-400"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              )}
            >
              {i + 1}
            </span>
            <span className="text-sm leading-relaxed text-zinc-300">{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (tab.key === "time_to_learn") {
    return (
      <div className="flex items-center gap-4">
        <span className={clsx(
          "flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold",
          tab.chipBg
        )}>
          <TabIcon size={16} className={tab.accent} />
          {value as string}
        </span>
      </div>
    );
  }

  return (
    <p className="text-sm leading-relaxed text-zinc-300">{value as string}</p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type PanelState = "loading" | "idle" | "generating" | "ready" | "error";

export default function ResearchPanel({ articleId, initialBrief }: {
  articleId:    string;
  initialBrief: ResearchBrief | null;
}) {
  const [state, setState] = useState<PanelState>(initialBrief ? "ready" : "loading");
  const [brief, setBrief] = useState<ResearchBrief | null>(initialBrief);
  const [activeTab, setActiveTab] = useState<TabKey>("what_happened");
  const [error, setError] = useState<string | null>(null);

  // On mount, check if a brief exists in the DB (unless passed in from server)
  useEffect(() => {
    if (initialBrief) return;
    fetchBrief(articleId).then((b) => {
      if (b) { setBrief(b); setState("ready"); }
      else   { setState("idle"); }
    });
  }, [articleId, initialBrief]);

  async function handleGenerate() {
    setState("generating");
    setError(null);
    const result = await generateBrief(articleId);
    if (result) {
      setBrief(result);
      setState("ready");
      setActiveTab("what_happened");
    } else {
      setState("error");
      setError("Generation failed — check your API key or try again.");
    }
  }

  async function handleRegenerate() {
    setState("generating");
    setError(null);
    const result = await generateBrief(articleId);
    if (result) {
      setBrief(result);
      setState("ready");
    } else {
      setState("error");
      setError("Regeneration failed — try again.");
    }
  }

  const activeTabDef = TABS.find((t) => t.key === activeTab)!;

  return (
    <section className="mb-10">
      {/* ── Section header ── */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical size={13} className="text-violet-400" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-violet-400">
            Research Notes
          </h2>
        </div>

        {state === "ready" && brief && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-600">
              Generated {new Date(brief.generated_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
              })}
            </span>
            <button
              onClick={handleRegenerate}
              className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-300"
            >
              <RefreshCw size={9} />
              Regenerate
            </button>
          </div>
        )}
      </div>

      {/* ── Loading skeleton ── */}
      {state === "loading" && (
        <div className="flex h-28 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40">
          <Loader2 size={16} className="animate-spin text-zinc-600" />
        </div>
      )}

      {/* ── Idle: generate button ── */}
      {(state === "idle" || state === "error") && (
        <div className="rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10">
              <FlaskConical size={22} className="text-violet-400" />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-200">Generate Research Brief</p>
              <p className="text-xs text-zinc-500">
                Get a structured breakdown: what happened, why it matters to builders,
                use cases, risks, and how long it takes to learn.
              </p>
            </div>
            {error && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/8 px-3 py-1.5 text-xs text-rose-400">
                {error}
              </p>
            )}
            <button
              onClick={handleGenerate}
              className={clsx(
                "flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-semibold transition-all",
                "border-violet-500/50 bg-violet-500/15 text-violet-200",
                "hover:border-violet-400/60 hover:bg-violet-500/25 hover:shadow-[0_0_20px_-4px_rgba(139,92,246,0.4)]"
              )}
            >
              <Sparkles size={14} />
              Research
            </button>
          </div>
        </div>
      )}

      {/* ── Generating spinner ── */}
      {state === "generating" && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 size={24} className="animate-spin text-violet-400" />
            <div>
              <p className="text-sm font-semibold text-violet-300">Generating research brief…</p>
              <p className="mt-1 text-xs text-zinc-600">
                Analysing the article across 5 dimensions
              </p>
            </div>
            <div className="flex items-center gap-2">
              {["What Happened", "Why Builders Care", "Use Cases", "Risks", "Time to Learn"].map((label, i) => (
                <span
                  key={label}
                  className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-600"
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500/60" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Ready: tabbed brief ── */}
      {state === "ready" && brief && (
        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60">

          {/* Tab bar */}
          <div className="flex overflow-x-auto border-b border-zinc-800 bg-zinc-900/60 scrollbar-hide">
            {TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={clsx(
                    "flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-xs font-medium transition-colors",
                    isActive
                      ? `border-current ${tab.accent}`
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <TabIcon size={11} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Active tab content */}
          <div className="p-5">
            <div className="mb-3 flex items-center gap-2">
              {(() => {
                const Icon = activeTabDef.icon;
                return (
                  <>
                    <Icon size={13} className={activeTabDef.accent} />
                    <span className={clsx(
                      "text-[10px] font-semibold uppercase tracking-widest",
                      activeTabDef.accent
                    )}>
                      {activeTabDef.label}
                    </span>
                  </>
                );
              })()}
            </div>
            <BriefContent tab={activeTabDef} brief={brief} />
          </div>

          {/* Footer: all 5 done indicators */}
          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800/60 px-5 py-3">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={clsx(
                    "flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] transition-colors",
                    activeTab === tab.key
                      ? tab.chipBg
                      : "border-zinc-800 bg-zinc-900 text-zinc-600 hover:border-zinc-600 hover:text-zinc-400"
                  )}
                >
                  <Icon size={9} />
                  <CheckCircle2 size={8} className={activeTab === tab.key ? tab.accent : "text-zinc-700"} />
                </button>
              );
            })}
            <span className="ml-auto text-[10px] text-zinc-700">5 / 5 complete</span>
          </div>
        </div>
      )}
    </section>
  );
}
