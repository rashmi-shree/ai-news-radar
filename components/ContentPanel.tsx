"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  Film,
  Loader2,
  Megaphone,
  Play,
  RefreshCw,
  Share2,
} from "lucide-react";
import { clsx } from "clsx";
import type { ContentType, ContentGeneration } from "@/src/lib/ai/contentGeneration";

// ─── Config ───────────────────────────────────────────────────────────────────

interface ContentTypeDef {
  type:        ContentType;
  label:       string;
  buttonLabel: string;
  Icon:        React.ElementType;
  accent:      string;
  activeCls:   string;
  buttonCls:   string;
  badgeCls:    string;
  hookLabel:   string;
  bodyLabel:   string;
  ctaLabel:    string;
}

const CONTENT_TYPES: ContentTypeDef[] = [
  {
    type:        "reel",
    label:       "Reel",
    buttonLabel: "Make Reel",
    Icon:        Film,
    accent:      "text-rose-400",
    activeCls:   "border-rose-500/50 bg-rose-500/10 text-rose-200 shadow-[0_0_16px_-4px_rgba(244,63,94,0.4)]",
    buttonCls:   "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:border-rose-400/60 hover:bg-rose-500/20",
    badgeCls:    "border-rose-500/30 bg-rose-500/8 text-rose-300",
    hookLabel:   "Hook",
    bodyLabel:   "Script",
    ctaLabel:    "CTA",
  },
  {
    type:        "youtube",
    label:       "YouTube",
    buttonLabel: "Make YouTube",
    Icon:        Play,
    accent:      "text-red-400",
    activeCls:   "border-red-500/50 bg-red-500/10 text-red-200 shadow-[0_0_16px_-4px_rgba(239,68,68,0.4)]",
    buttonCls:   "border-red-500/40 bg-red-500/10 text-red-300 hover:border-red-400/60 hover:bg-red-500/20",
    badgeCls:    "border-red-500/30 bg-red-500/8 text-red-300",
    hookLabel:   "Hook",
    bodyLabel:   "Video Outline",
    ctaLabel:    "CTA",
  },
  {
    type:        "linkedin",
    label:       "LinkedIn",
    buttonLabel: "Make LinkedIn",
    Icon:        Share2,
    accent:      "text-sky-400",
    activeCls:   "border-sky-500/50 bg-sky-500/10 text-sky-200 shadow-[0_0_16px_-4px_rgba(14,165,233,0.4)]",
    buttonCls:   "border-sky-500/40 bg-sky-500/10 text-sky-300 hover:border-sky-400/60 hover:bg-sky-500/20",
    badgeCls:    "border-sky-500/30 bg-sky-500/8 text-sky-300",
    hookLabel:   "Hook",
    bodyLabel:   "Post Body",
    ctaLabel:    "CTA",
  },
];

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchAll(
  articleId: string
): Promise<Partial<Record<ContentType, ContentGeneration>>> {
  const res = await fetch(`/api/article/content?articleId=${encodeURIComponent(articleId)}`);
  if (!res.ok) return {};
  const json = await res.json() as {
    ok: boolean;
    generations: Partial<Record<ContentType, ContentGeneration>>;
  };
  return json.ok ? json.generations : {};
}

async function generate(
  articleId: string,
  type:      ContentType
): Promise<ContentGeneration | null> {
  const res = await fetch("/api/article/content", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ articleId, type }),
  });
  if (!res.ok) return null;
  const json = await res.json() as { ok: boolean; content: ContentGeneration | null };
  return json.ok ? json.content : null;
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-300"
    >
      {copied ? <Check size={9} className="text-emerald-400" /> : <Copy size={9} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ─── Content block ────────────────────────────────────────────────────────────

function ContentBlock({
  label,
  value,
  accent,
}: {
  label:  string;
  value:  string;
  accent: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-800/60 bg-zinc-900/40 p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <span className={clsx(
          "text-[10px] font-semibold uppercase tracking-widest",
          accent
        )}>
          {label}
        </span>
        <CopyButton text={value} />
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-300">{value}</p>
    </div>
  );
}

// ─── Generated card ───────────────────────────────────────────────────────────

function GeneratedCard({
  def,
  content,
  onRegenerate,
  generating,
}: {
  def:          ContentTypeDef;
  content:      ContentGeneration;
  onRegenerate: () => void;
  generating:   boolean;
}) {
  const fullText = `${content.hook}\n\n${content.body}\n\n${content.cta}`;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/60">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <def.Icon size={12} className={def.accent} />
          <span className={clsx("text-[10px] font-semibold uppercase tracking-widest", def.accent)}>
            {def.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={fullText} />
          <button
            onClick={onRegenerate}
            disabled={generating}
            className="flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-300 disabled:opacity-40"
          >
            <RefreshCw size={9} className={generating ? "animate-spin" : ""} />
            {generating ? "…" : "Regenerate"}
          </button>
        </div>
      </div>

      {/* Three sections */}
      <div className="flex flex-col gap-3 p-4">
        <ContentBlock label={def.hookLabel} value={content.hook} accent={def.accent} />
        <ContentBlock label={def.bodyLabel} value={content.body} accent={def.accent} />
        <ContentBlock label={def.ctaLabel}  value={content.cta}  accent={def.accent} />
      </div>

      {/* Timestamp */}
      <div className="border-t border-zinc-800/40 px-4 py-2 text-right">
        <span className="text-[10px] text-zinc-700">
          Generated {new Date(content.generated_at).toLocaleDateString("en-US", {
            month: "short", day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type GenState = "idle" | "generating" | "done" | "error";

export default function ContentPanel({
  articleId,
  initialContent,
}: {
  articleId:      string;
  initialContent: Partial<Record<ContentType, ContentGeneration>>;
}) {
  const [loading, setLoading] = useState(Object.keys(initialContent).length === 0);
  const [content, setContent] = useState<Partial<Record<ContentType, ContentGeneration>>>(initialContent);
  const [genState, setGenState] = useState<Partial<Record<ContentType, GenState>>>({});
  const [activeTab, setActiveTab] = useState<ContentType | null>(
    // Open the first generated type on mount, if any
    (Object.keys(initialContent)[0] as ContentType) ?? null
  );

  // Fetch stored generations on mount if none passed from server
  useEffect(() => {
    if (Object.keys(initialContent).length > 0) { setLoading(false); return; }
    fetchAll(articleId).then((saved) => {
      setContent(saved);
      const first = Object.keys(saved)[0] as ContentType | undefined;
      if (first) setActiveTab(first);
      setLoading(false);
    });
  }, [articleId, initialContent]);

  async function handleGenerate(type: ContentType) {
    setGenState((s) => ({ ...s, [type]: "generating" }));
    setActiveTab(type);
    const result = await generate(articleId, type);
    if (result) {
      setContent((c) => ({ ...c, [type]: result }));
      setGenState((s) => ({ ...s, [type]: "done" }));
    } else {
      setGenState((s) => ({ ...s, [type]: "error" }));
    }
  }

  const generatedTypes = Object.keys(content) as ContentType[];

  return (
    <section className="mb-10">
      {/* ── Section header ── */}
      <div className="mb-4 flex items-center gap-2">
        <Megaphone size={13} className="text-zinc-400" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Create Content
        </h2>
      </div>

      {/* ── Generate buttons row ── */}
      <div className="flex flex-wrap gap-2">
        {CONTENT_TYPES.map((def) => {
          const state   = genState[def.type];
          const isReady = !!content[def.type];
          const isBusy  = state === "generating";

          return (
            <button
              key={def.type}
              onClick={() => isReady ? setActiveTab(def.type) : handleGenerate(def.type)}
              disabled={isBusy}
              className={clsx(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all",
                isReady
                  ? def.activeCls
                  : isBusy
                  ? "cursor-not-allowed border-zinc-700 bg-zinc-900 text-zinc-500"
                  : [def.buttonCls, "border"],
                "disabled:cursor-not-allowed"
              )}
            >
              {isBusy ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <def.Icon size={12} />
              )}
              {isBusy ? `Generating ${def.label}…` : isReady ? def.label : def.buttonLabel}
            </button>
          );
        })}
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="mt-4 flex h-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40">
          <Loader2 size={14} className="animate-spin text-zinc-600" />
        </div>
      )}

      {/* ── Tab pills (when multiple types generated) ── */}
      {!loading && generatedTypes.length > 1 && (
        <div className="mt-4 flex gap-2">
          {generatedTypes.map((type) => {
            const def = CONTENT_TYPES.find((d) => d.type === type)!;
            return (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  activeTab === type
                    ? def.badgeCls
                    : "border-zinc-800 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                )}
              >
                <def.Icon size={10} />
                {def.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Active type card ── */}
      {!loading && activeTab && content[activeTab] && (() => {
        const def = CONTENT_TYPES.find((d) => d.type === activeTab)!;
        const isBusy = genState[activeTab] === "generating";
        return (
          <GeneratedCard
            key={activeTab}
            def={def}
            content={content[activeTab]!}
            onRegenerate={() => handleGenerate(activeTab)}
            generating={isBusy}
          />
        );
      })()}

      {/* ── Inline generating indicator when no card yet ── */}
      {!loading && activeTab && !content[activeTab] && genState[activeTab] === "generating" && (() => {
        const def = CONTENT_TYPES.find((d) => d.type === activeTab)!;
        return (
          <div className="mt-4 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 size={20} className={clsx("animate-spin", def.accent)} />
              <p className={clsx("text-sm font-semibold", def.accent)}>
                Generating {def.label} content…
              </p>
              <div className="flex items-center gap-2 text-[10px] text-zinc-600">
                {["Hook", "Body", "CTA"].map((s) => (
                  <span key={s} className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-600" />
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </section>
  );
}
