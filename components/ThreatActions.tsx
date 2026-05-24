"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  BookmarkCheck,
  CheckCircle2,
  Circle,
  EyeOff,
  Loader2,
  SearchCode,
} from "lucide-react";
import { clsx } from "clsx";
import { getArticleStatus } from "@/src/lib/supabase/savedArticles";
import type { WorkspaceStatus } from "@/src/lib/supabase/savedArticles";

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastState {
  id: number;
  message: string;
  type: "success" | "warning";
}

function Toast({ toast, onDone }: { toast: ToastState; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2_400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className={clsx(
        "animate-toast-in flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-xl",
        toast.type === "success"
          ? "border-cyan-500/30 bg-cyan-950/80 text-cyan-300"
          : "border-zinc-700 bg-zinc-900 text-zinc-400"
      )}
    >
      <span
        className={clsx(
          "h-1.5 w-1.5 rounded-full",
          toast.type === "success" ? "bg-cyan-400" : "bg-zinc-500"
        )}
      />
      {toast.message}
    </div>
  );
}

// ─── Action config ────────────────────────────────────────────────────────────

type ActionDef = {
  status:      WorkspaceStatus;
  label:       string;
  activeLabel: string;
  toast:       string;
  Icon:        React.ElementType;
  ActiveIcon:  React.ElementType;
  // Applied to the button when this status is active
  activeBase:  string;   // border + bg + text
  activeGlow:  string;   // box-shadow class
  activeDot:   string;   // indicator dot colour
};

const ACTIONS: ActionDef[] = [
  {
    status:      "saved",
    label:       "Save",
    activeLabel: "Saved",
    toast:       "Threat saved",
    Icon:        Bookmark,
    ActiveIcon:  BookmarkCheck,
    activeBase:  "border-cyan-500/60 bg-cyan-500/15 text-cyan-200",
    activeGlow:  "shadow-[0_0_18px_3px_rgba(6,182,212,0.30)]",
    activeDot:   "bg-cyan-400",
  },
  {
    status:      "investigating",
    label:       "Investigating",
    activeLabel: "Investigating",
    toast:       "Investigation started",
    Icon:        SearchCode,
    ActiveIcon:  SearchCode,
    activeBase:  "border-amber-500/60 bg-amber-500/15 text-amber-200",
    activeGlow:  "shadow-[0_0_18px_3px_rgba(245,158,11,0.30)]",
    activeDot:   "bg-amber-400",
  },
  {
    status:      "reviewed",
    label:       "Mark Reviewed",
    activeLabel: "Reviewed",
    toast:       "Marked reviewed",
    Icon:        Circle,
    ActiveIcon:  CheckCircle2,
    activeBase:  "border-emerald-500/60 bg-emerald-500/15 text-emerald-200",
    activeGlow:  "shadow-[0_0_18px_3px_rgba(34,197,94,0.25)]",
    activeDot:   "bg-emerald-400",
  },
  {
    status:      "ignored",
    label:       "Ignore",
    activeLabel: "Ignored",
    toast:       "Threat ignored",
    Icon:        EyeOff,
    ActiveIcon:  EyeOff,
    activeBase:  "border-zinc-500/60 bg-zinc-800 text-zinc-300",
    activeGlow:  "shadow-[0_0_12px_2px_rgba(113,113,122,0.25)]",
    activeDot:   "bg-zinc-500",
  },
];

// ─── API helper ───────────────────────────────────────────────────────────────

async function postAction(
  articleId: string,
  action: WorkspaceStatus
): Promise<{ ok: boolean; status: WorkspaceStatus | null }> {
  try {
    const res = await fetch("/api/article/action", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ articleId, action }),
    });
    if (!res.ok) return { ok: false, status: null };
    return res.json() as Promise<{ ok: boolean; status: WorkspaceStatus | null }>;
  } catch {
    return { ok: false, status: null };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ThreatActions({ articleId }: { articleId: string }) {
  const router = useRouter();

  const [current, setCurrent]           = useState<WorkspaceStatus | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [busyStatus, setBusyStatus]     = useState<WorkspaceStatus | null>(null);
  const [toasts, setToasts]             = useState<ToastState[]>([]);
  const toastCounter = useRef(0);

  // Load current status from DB on mount
  useEffect(() => {
    getArticleStatus(articleId).then((s) => {
      setCurrent(s);
      setInitializing(false);
    });
  }, [articleId]);

  function addToast(message: string, type: ToastState["type"] = "success") {
    const id = ++toastCounter.current;
    setToasts((prev) => [...prev, { id, message, type }]);
  }

  function removeToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  async function handleClick(def: ActionDef) {
    // Already busy or still loading initial state
    if (initializing || busyStatus !== null) return;
    // Duplicate click on the already-active button — do nothing
    if (current === def.status) return;

    setBusyStatus(def.status);

    try {
      const result = await postAction(articleId, def.status);

      if (result.ok) {
        setCurrent(result.status);
        addToast(def.toast);
        router.refresh(); // bust Next.js router cache so /workspace refreshes
      } else {
        addToast("Action failed — try again", "warning");
      }
    } catch {
      addToast("Action failed — try again", "warning");
    } finally {
      setBusyStatus(null);
    }
  }

  // Any button other than the currently-busy one is disabled while a call is in flight
  const anyBusy = busyStatus !== null;

  return (
    <section className="mb-10">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-600">
        Threat Actions
      </h2>

      <div className="flex flex-wrap gap-3">
        {ACTIONS.map((def) => {
          const isActive = current === def.status;
          const isBusy   = busyStatus === def.status;

          // Active button is never "clickable" — it is in a terminal selected state.
          // Other buttons are disabled only while a different one is mid-flight.
          const isDisabled = initializing || (anyBusy && !isBusy) || isActive;

          const ButtonIcon = isBusy
            ? Loader2
            : isActive
            ? def.ActiveIcon
            : def.Icon;

          return (
            <button
              key={def.status}
              onClick={() => handleClick(def)}
              disabled={isDisabled}
              aria-pressed={isActive}
              title={isActive ? `Currently ${def.activeLabel}` : def.label}
              className={clsx(
                "relative flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium",
                "transition-all duration-200",
                isActive
                  ? [
                      def.activeBase,
                      def.activeGlow,
                      // active = no pointer, no hover flicker
                      "cursor-default select-none",
                    ]
                  : [
                      "border-zinc-700 bg-zinc-900 text-zinc-400",
                      "hover:border-zinc-500 hover:text-slate-100",
                      "disabled:cursor-not-allowed disabled:opacity-40",
                    ]
              )}
            >
              <ButtonIcon
                size={14}
                className={clsx(isBusy && "animate-spin")}
              />

              <span>{isActive ? def.activeLabel : def.label}</span>

              {/* Glowing active indicator dot */}
              {isActive && (
                <span
                  className={clsx(
                    "absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full ring-2 ring-zinc-950",
                    def.activeDot
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Status caption when something is active */}
      {current && !initializing && (
        <p className="mt-3 text-xs text-zinc-600">
          Click another action to transition this article.
        </p>
      )}

      {/* Toast stack */}
      {toasts.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onDone={() => removeToast(t.id)} />
          ))}
        </div>
      )}
    </section>
  );
}
