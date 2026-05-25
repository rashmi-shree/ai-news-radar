"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { clsx } from "clsx";
import type { CollectionColor } from "@/src/lib/supabase/collections";

const COLOR_DOT: Record<CollectionColor, string> = {
  zinc:    "bg-zinc-400",
  rose:    "bg-rose-400",
  amber:   "bg-amber-400",
  violet:  "bg-violet-400",
  sky:     "bg-sky-400",
  emerald: "bg-emerald-400",
  orange:  "bg-orange-400",
};

const COLORS: CollectionColor[] = ["zinc","rose","amber","violet","sky","emerald","orange"];

export default function CreateCollectionButton({ label = "New Collection" }: { label?: string }) {
  const router = useRouter();
  const [open,     setOpen]     = useState(false);
  const [name,     setName]     = useState("");
  const [desc,     setDesc]     = useState("");
  const [color,    setColor]    = useState<CollectionColor>("zinc");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function openModal() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    const res = await fetch("/api/collections", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: name.trim(), description: desc.trim() || null, color }),
    });
    setCreating(false);
    if (res.ok) {
      setOpen(false);
      setName("");
      setDesc("");
      setColor("zinc");
      router.refresh();
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
      >
        <Plus size={12} />
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/60">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-100">New Collection</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-5">
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Name *
              </label>
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="e.g. AI Agents, Startup Ideas…"
                className="mb-4 w-full rounded border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500"
              />

              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Description
              </label>
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Optional short description…"
                className="mb-4 w-full rounded border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:border-zinc-500"
              />

              <label className="mb-2 block text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                Color
              </label>
              <div className="flex gap-2.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={clsx(
                      "h-5 w-5 rounded-full transition-transform",
                      COLOR_DOT[c],
                      color === c
                        ? "scale-125 ring-2 ring-white/30 ring-offset-2 ring-offset-zinc-900"
                        : "opacity-50 hover:opacity-90"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 border-t border-zinc-800 px-5 py-4">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 rounded border border-zinc-700 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
                className="flex flex-1 items-center justify-center gap-1.5 rounded border border-violet-500/50 bg-violet-500/15 py-2 text-xs font-semibold text-violet-200 transition-colors hover:bg-violet-500/25 disabled:opacity-40"
              >
                {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                {creating ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
