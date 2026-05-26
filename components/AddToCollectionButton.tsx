"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, FolderOpen, Loader2, Plus, X } from "lucide-react";
import { clsx } from "clsx";
import type { UserCollection, CollectionColor } from "@/src/lib/supabase/collections";

// ─── Color palette ────────────────────────────────────────────────────────────

const COLOR_DOT: Record<CollectionColor, string> = {
  zinc:    "bg-zinc-400",
  rose:    "bg-rose-400",
  amber:   "bg-amber-400",
  violet:  "bg-violet-400",
  sky:     "bg-sky-400",
  emerald: "bg-emerald-400",
  orange:  "bg-orange-400",
};

const COLOR_SWATCHES: CollectionColor[] = [
  "zinc", "rose", "amber", "violet", "sky", "emerald", "orange",
];

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchCollections(): Promise<UserCollection[]> {
  const res = await fetch("/api/collections");
  if (!res.ok) return [];
  const json = await res.json() as { ok: boolean; collections: UserCollection[] };
  return json.ok ? json.collections : [];
}

async function fetchMemberships(articleId: string): Promise<string[]> {
  const res = await fetch(`/api/collections/articles?articleId=${encodeURIComponent(articleId)}`);
  if (!res.ok) return [];
  const json = await res.json() as { ok: boolean; collectionIds: string[] };
  return json.ok ? json.collectionIds : [];
}

async function postCollectionAction(body: object): Promise<boolean> {
  const res = await fetch("/api/collections/articles", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  return res.ok;
}

async function createNewCollection(
  name:  string,
  color: CollectionColor
): Promise<UserCollection | null> {
  const res = await fetch("/api/collections", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ name, color }),
  });
  if (!res.ok) return null;
  const json = await res.json() as { ok: boolean; collection: UserCollection };
  return json.ok ? json.collection : null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function NewCollectionForm({ onCreated }: { onCreated: (c: UserCollection) => void }) {
  const [name,     setName]     = useState("");
  const [color,    setColor]    = useState<CollectionColor>("zinc");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    const collection = await createNewCollection(name.trim(), color);
    if (collection) onCreated(collection);
    setCreating(false);
  }

  return (
    <div className="border-t border-zinc-800 px-3 pb-3 pt-3">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
        New collection
      </p>
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        placeholder="Collection name…"
        className="mb-2 w-full rounded border border-zinc-700 bg-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500"
      />
      {/* Color picker */}
      <div className="mb-2.5 flex gap-1.5">
        {COLOR_SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={clsx(
              "h-4 w-4 rounded-full transition-transform",
              COLOR_DOT[c],
              color === c ? "scale-125 ring-2 ring-white/30 ring-offset-1 ring-offset-zinc-900" : "opacity-60 hover:opacity-100"
            )}
          />
        ))}
      </div>
      <button
        onClick={handleCreate}
        disabled={!name.trim() || creating}
        className="flex w-full items-center justify-center gap-1.5 rounded border border-zinc-600 bg-zinc-800 py-1.5 text-xs font-semibold text-zinc-100 transition-colors hover:border-zinc-400 disabled:opacity-40"
      >
        {creating ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
        {creating ? "Creating…" : "Create"}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AddToCollectionButton({ articleId }: { articleId: string }) {
  const [open,        setOpen]        = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [memberOf,    setMemberOf]    = useState<Set<string>>(new Set());
  const [toggling,    setToggling]    = useState<string | null>(null);
  const [showForm,    setShowForm]    = useState(false);
  const [moveFrom,    setMoveFrom]    = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowForm(false);
        setMoveFrom(null);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function openPopover() {
    setOpen(true);
    setLoading(true);
    const [cols, ids] = await Promise.all([
      fetchCollections(),
      fetchMemberships(articleId),
    ]);
    setCollections(cols);
    setMemberOf(new Set(ids));
    setLoading(false);
  }

  async function toggleCollection(collectionId: string) {
    setToggling(collectionId);

    if (moveFrom) {
      // Move mode: remove from source, add to this
      const ok = await postCollectionAction({
        action:           "move",
        fromCollectionId: moveFrom,
        collectionId,
        articleId,
      });
      if (ok) {
        setMemberOf((prev) => {
          const next = new Set(prev);
          next.delete(moveFrom);
          next.add(collectionId);
          return next;
        });
      }
      setMoveFrom(null);
    } else if (memberOf.has(collectionId)) {
      const ok = await postCollectionAction({ action: "remove", collectionId, articleId });
      if (ok) setMemberOf((prev) => { const n = new Set(prev); n.delete(collectionId); return n; });
    } else {
      const ok = await postCollectionAction({ action: "add", collectionId, articleId });
      if (ok) setMemberOf((prev) => new Set([...prev, collectionId]));
    }

    setToggling(null);
  }

  function handleCreated(collection: UserCollection) {
    setCollections((prev) => [...prev, collection]);
    setShowForm(false);
    // Immediately add the article to it
    void toggleCollection(collection.id);
  }

  const memberCount = memberOf.size;

  return (
    <div className="relative" ref={popoverRef}>
      {/* ── Trigger button ── */}
      <button
        onClick={open ? () => setOpen(false) : openPopover}
        className={clsx(
          "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all",
          memberCount > 0
            ? "border-violet-500/50 bg-violet-500/10 text-violet-200 shadow-[0_0_16px_-4px_rgba(139,92,246,0.4)]"
            : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
        )}
      >
        <FolderOpen size={13} />
        {memberCount > 0 ? `In ${memberCount} collection${memberCount > 1 ? "s" : ""}` : "Add to Collection"}
      </button>

      {/* ── Popover ── */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-zinc-700/80 bg-zinc-900 shadow-2xl shadow-black/60">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              Collections
            </span>
            <div className="flex items-center gap-1">
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                  title="New collection"
                >
                  <Plus size={12} />
                </button>
              )}
              <button
                onClick={() => { setOpen(false); setShowForm(false); setMoveFrom(null); }}
                className="rounded p-1 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* Move mode banner */}
          {moveFrom && (
            <div className="flex items-center justify-between bg-violet-900/30 px-3 py-2 text-[10px] text-violet-300">
              <span className="flex items-center gap-1">
                <ChevronRight size={10} />
                Choose destination collection
              </span>
              <button onClick={() => setMoveFrom(null)} className="text-violet-400 hover:text-violet-200">
                Cancel
              </button>
            </div>
          )}

          {/* Collections list */}
          <div className="max-h-64 overflow-y-auto py-1">
            {loading && (
              <div className="flex h-16 items-center justify-center">
                <Loader2 size={14} className="animate-spin text-zinc-600" />
              </div>
            )}
            {!loading && collections.length === 0 && !showForm && (
              <p className="px-3 py-4 text-center text-[11px] text-zinc-600">
                No collections yet. Create one below.
              </p>
            )}
            {!loading && collections.map((col) => {
              const isMember  = memberOf.has(col.id);
              const isMoveSrc = moveFrom === col.id;
              const busy      = toggling === col.id;

              return (
                <div key={col.id} className="group flex items-center justify-between px-3 py-2 hover:bg-zinc-800/60">
                  {/* Left: toggle button */}
                  <button
                    onClick={() => !isMoveSrc && toggleCollection(col.id)}
                    disabled={busy || isMoveSrc}
                    className="flex flex-1 items-center gap-2.5 text-left disabled:cursor-default"
                  >
                    <span className={clsx("h-2.5 w-2.5 shrink-0 rounded-full", COLOR_DOT[col.color as CollectionColor] ?? "bg-zinc-400")} />
                    <span className={clsx(
                      "flex-1 text-xs",
                      isMember ? "font-semibold text-zinc-100" : "text-zinc-400 group-hover:text-zinc-200"
                    )}>
                      {col.name}
                    </span>
                    {busy ? (
                      <Loader2 size={11} className="animate-spin text-zinc-500" />
                    ) : isMember && !isMoveSrc ? (
                      <Check size={11} className="text-emerald-400" />
                    ) : null}
                  </button>

                  {/* Right: Move button (only shows when article is in this collection) */}
                  {isMember && !moveFrom && (
                    <button
                      onClick={() => setMoveFrom(col.id)}
                      title="Move to another collection"
                      className="ml-2 shrink-0 rounded p-1 text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-zinc-700 hover:text-zinc-300"
                    >
                      <ChevronRight size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* New collection form */}
          {showForm && <NewCollectionForm onCreated={handleCreated} />}

          {/* Footer link */}
          {!showForm && (
            <div className="border-t border-zinc-800 px-3 py-2">
              <a
                href="/collections"
                className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400"
              >
                <FolderOpen size={10} />
                View all collections
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
