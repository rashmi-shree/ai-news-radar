"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { clsx } from "clsx";
import { getArticleNotes } from "@/src/lib/supabase/savedArticles";

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveState = "idle" | "saving" | "saved" | "error";

// ─── API helper ───────────────────────────────────────────────────────────────

async function patchNotes(articleId: string, notes: string): Promise<boolean> {
  try {
    const res = await fetch("/api/article/notes", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ articleId, notes }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

const MAX_CHARS = 1000;
const AUTOSAVE_MS = 1200; // debounce after user stops typing

export default function InvestigationNotes({ articleId }: { articleId: string }) {
  const [notes, setNotes]             = useState("");
  const [saveState, setSaveState]     = useState<SaveState>("idle");
  const [tracked, setTracked]         = useState<boolean | null>(null); // null = loading
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved     = useRef<string>("");

  // ── Load existing notes on mount ──
  useEffect(() => {
    getArticleNotes(articleId).then(({ notes: existing, status }) => {
      setTracked(status !== null);
      setNotes(existing ?? "");
      lastSaved.current = existing ?? "";
    });
  }, [articleId]);

  // ── Save function ──
  const save = useCallback(async (text: string) => {
    if (text === lastSaved.current) return; // nothing changed
    setSaveState("saving");
    const ok = await patchNotes(articleId, text);
    if (ok) {
      lastSaved.current = text;
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } else {
      setSaveState("error");
    }
  }, [articleId]);

  // ── Autosave on typing (debounced) ──
  function handleChange(value: string) {
    if (value.length > MAX_CHARS) return;
    setNotes(value);
    setSaveState("idle");

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => save(value), AUTOSAVE_MS);
  }

  // ── Cleanup timer on unmount ──
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  // ── Render ──

  return (
    <section className="mb-10">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={13} className="text-zinc-500" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-600">
            Investigation Notes
          </h2>
        </div>

        {/* Save status indicator */}
        <span className="flex items-center gap-1.5 text-[10px] tabular-nums">
          {saveState === "saving" && (
            <>
              <Loader2 size={10} className="animate-spin text-zinc-500" />
              <span className="text-zinc-500">Saving…</span>
            </>
          )}
          {saveState === "saved" && (
            <>
              <CheckCircle2 size={10} className="text-emerald-400" />
              <span className="text-emerald-500">Saved</span>
            </>
          )}
          {saveState === "error" && (
            <>
              <AlertCircle size={10} className="text-red-400" />
              <span className="text-red-400">Failed to save</span>
            </>
          )}
          {saveState === "idle" && notes !== lastSaved.current && (
            <span className="text-zinc-600">Unsaved changes</span>
          )}
        </span>
      </div>

      {/* Loading skeleton */}
      {tracked === null && (
        <div className="h-28 animate-pulse rounded-xl bg-zinc-900" />
      )}

      {/* Not tracked — prompt user */}
      {tracked === false && (
        <div className="flex items-start gap-3 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40 px-4 py-4">
          <FileText size={14} className="mt-0.5 shrink-0 text-zinc-700" />
          <p className="text-xs text-zinc-600">
            Save or investigate this article to enable investigation notes.
          </p>
        </div>
      )}

      {/* Notes textarea */}
      {tracked === true && (
        <>
          <div className="relative">
            <textarea
              value={notes}
              onChange={(e) => handleChange(e.target.value)}
              onBlur={() => save(notes)}
              placeholder="Add investigation notes, IOCs, affected systems, timeline details…"
              rows={5}
              maxLength={MAX_CHARS}
              className={clsx(
                "w-full resize-y rounded-xl border bg-zinc-900/80 px-4 py-3",
                "font-mono text-xs text-slate-300 placeholder:text-zinc-700",
                "transition-colors duration-150 outline-none",
                "border-zinc-800 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20",
                saveState === "error" && "border-red-500/40"
              )}
            />

            {/* Character counter */}
            <span
              className={clsx(
                "absolute bottom-3 right-3 font-mono text-[10px] tabular-nums",
                notes.length > MAX_CHARS * 0.9 ? "text-amber-500" : "text-zinc-700"
              )}
            >
              {notes.length}/{MAX_CHARS}
            </span>
          </div>

          {/* Manual save button */}
          <div className="mt-2 flex items-center justify-end gap-3">
            {notes !== lastSaved.current && (
              <span className="text-[10px] text-zinc-600">
                Auto-saves {AUTOSAVE_MS / 1000}s after you stop typing
              </span>
            )}
            <button
              onClick={() => save(notes)}
              disabled={saveState === "saving" || notes === lastSaved.current}
              className={clsx(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                saveState === "saving" || notes === lastSaved.current
                  ? "cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-600"
                  : "border-cyan-500/40 bg-cyan-500/10 text-cyan-400 hover:border-cyan-500/60 hover:bg-cyan-500/15"
              )}
            >
              {saveState === "saving" ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <CheckCircle2 size={11} />
              )}
              Save note
            </button>
          </div>
        </>
      )}
    </section>
  );
}
