"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Clock,
  Code2,
  Hammer,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Wrench,
} from "lucide-react";
import { clsx } from "clsx";
import type { BuildIdea, Difficulty } from "@/src/lib/ai/buildIdea";

// ─── Difficulty badge ─────────────────────────────────────────────────────────

const DIFFICULTY_STYLE: Record<Difficulty, string> = {
  Beginner:     "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  Intermediate: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  Advanced:     "border-rose-500/40 bg-rose-500/10 text-rose-300",
};

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchIdea(articleId: string): Promise<BuildIdea | null> {
  const res = await fetch(`/api/article/build-idea?articleId=${encodeURIComponent(articleId)}`);
  if (!res.ok) return null;
  const json = await res.json() as { ok: boolean; idea: BuildIdea | null };
  return json.ok ? json.idea : null;
}

async function generateIdea(articleId: string): Promise<BuildIdea | null> {
  const res = await fetch("/api/article/build-idea", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ articleId }),
  });
  if (!res.ok) return null;
  const json = await res.json() as { ok: boolean; idea: BuildIdea | null };
  return json.ok ? json.idea : null;
}

// ─── Idea card ────────────────────────────────────────────────────────────────

function IdeaCard({ idea, onRegenerate, generating }: {
  idea:        BuildIdea;
  onRegenerate: () => void;
  generating:  boolean;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60">

      {/* ── Header: idea name + difficulty + regenerate ── */}
      <div className="flex items-start justify-between gap-4 border-b border-zinc-800 bg-zinc-900/60 px-5 py-4">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <Hammer size={13} className="shrink-0 text-violet-400" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-400">
              Build Idea
            </span>
          </div>
          <h3 className="text-base font-bold leading-snug text-slate-100">
            {idea.idea_name}
          </h3>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className={clsx(
            "rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            DIFFICULTY_STYLE[idea.difficulty]
          )}>
            {idea.difficulty}
          </span>
          <button
            onClick={onRegenerate}
            disabled={generating}
            className={clsx(
              "flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1",
              "text-[10px] text-zinc-500 transition-colors",
              "hover:border-zinc-500 hover:text-zinc-300",
              "disabled:cursor-not-allowed disabled:opacity-40"
            )}
          >
            <RefreshCw size={9} className={generating ? "animate-spin" : ""} />
            {generating ? "…" : "Regenerate"}
          </button>
        </div>
      </div>

      {/* ── Problem solved ── */}
      <div className="border-b border-zinc-800/60 px-5 py-4">
        <div className="mb-2 flex items-center gap-2">
          <Target size={11} className="text-sky-400" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-sky-400">
            Problem Solved
          </span>
        </div>
        <p className="text-sm leading-relaxed text-zinc-300">{idea.problem_solved}</p>
      </div>

      {/* ── Tech stack + MVP scope (two column) ── */}
      <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">

        {/* Tech stack */}
        <div className="border-b border-zinc-800/60 px-5 py-4 sm:border-b-0 sm:border-r">
          <div className="mb-3 flex items-center gap-2">
            <Code2 size={11} className="text-cyan-400" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
              Tech Stack
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {idea.tech_stack.map((tech) => (
              <span
                key={tech}
                className="rounded-md border border-cyan-500/25 bg-cyan-500/8 px-2 py-0.5 font-mono text-[11px] text-cyan-300"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        {/* MVP scope */}
        <div className="border-b border-zinc-800/60 px-5 py-4">
          <div className="mb-3 flex items-center gap-2">
            <Layers size={11} className="text-violet-400" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-violet-400">
              MVP Scope
            </span>
          </div>
          <ul className="flex flex-col gap-2">
            {idea.mvp_scope.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded border border-violet-500/30 bg-violet-500/10 font-mono text-[9px] font-bold text-violet-400">
                  {i + 1}
                </span>
                <span className="text-xs leading-relaxed text-zinc-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Footer: time estimate ── */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <Clock size={11} className="text-amber-400" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
            Time Estimate
          </span>
          <span className="rounded-md border border-amber-500/30 bg-amber-500/8 px-2 py-0.5 text-xs font-semibold text-amber-300">
            {idea.time_estimate}
          </span>
        </div>
        <span className="text-[10px] text-zinc-700">
          Generated {new Date(idea.generated_at).toLocaleDateString("en-US", {
            month: "short", day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type PanelState = "loading" | "idle" | "generating" | "ready" | "error";

export default function BuildIdeaPanel({ articleId, initialIdea }: {
  articleId:   string;
  initialIdea: BuildIdea | null;
}) {
  const [state, setState]       = useState<PanelState>(initialIdea ? "ready" : "loading");
  const [idea, setIdea]         = useState<BuildIdea | null>(initialIdea);
  const [error, setError]       = useState<string | null>(null);

  // Check DB for existing idea on mount (if not passed from server)
  useEffect(() => {
    if (initialIdea) return;
    fetchIdea(articleId).then((saved) => {
      if (saved) { setIdea(saved); setState("ready"); }
      else       { setState("idle"); }
    });
  }, [articleId, initialIdea]);

  async function handleGenerate() {
    setState("generating");
    setError(null);
    const result = await generateIdea(articleId);
    if (result) {
      setIdea(result);
      setState("ready");
    } else {
      setState("error");
      setError("Generation failed — check your config or try again.");
    }
  }

  return (
    <section className="mb-10">
      {/* ── Section header ── */}
      <div className="mb-4 flex items-center gap-2">
        <Box size={13} className="text-violet-400" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-violet-400">
          Build Idea
        </h2>
      </div>

      {/* ── Loading skeleton ── */}
      {state === "loading" && (
        <div className="flex h-28 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40">
          <Loader2 size={16} className="animate-spin text-zinc-600" />
        </div>
      )}

      {/* ── Idle / error: generate button ── */}
      {(state === "idle" || state === "error") && (
        <div className="rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 p-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/10">
              <Hammer size={22} className="text-violet-400" />
            </div>
            <div>
              <p className="mb-1 text-sm font-semibold text-slate-200">Generate a Build Idea</p>
              <p className="text-xs text-zinc-500">
                Get a concrete product idea from this article — with a problem statement,
                tech stack, MVP scope, and time estimate.
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
                "hover:border-violet-400/60 hover:bg-violet-500/25",
                "hover:shadow-[0_0_20px_-4px_rgba(139,92,246,0.4)]"
              )}
            >
              <Sparkles size={14} />
              Build Idea
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
              <p className="text-sm font-semibold text-violet-300">Generating build idea…</p>
              <p className="mt-1 text-xs text-zinc-600">
                Synthesising idea name, tech stack, MVP scope, and timeline
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {["Idea Name", "Problem", "Tech Stack", "MVP Scope", "Timeline"].map((label, i) => (
                <span
                  key={label}
                  className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-600"
                  style={{ animationDelay: `${i * 0.12}s` }}
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-500/60" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Ready: idea card ── */}
      {state === "ready" && idea && (
        <IdeaCard
          idea={idea}
          onRegenerate={handleGenerate}
          generating={false}
        />
      )}
    </section>
  );
}
