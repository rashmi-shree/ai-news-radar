import Link from "next/link";
import { FolderOpen, FolderPlus, Layers } from "lucide-react";
import { clsx } from "clsx";
import Header from "@/components/Header";
import { getCollections, type CollectionColor } from "@/src/lib/supabase/collections";
import CreateCollectionButton from "@/components/CreateCollectionButton";

// ─── Color config ──────────────────────────────────────────────────────────────

const COLOR_RING: Record<CollectionColor, string> = {
  zinc:    "border-zinc-600/60  bg-zinc-800/40",
  rose:    "border-rose-500/40  bg-rose-500/8",
  amber:   "border-amber-500/40 bg-amber-500/8",
  violet:  "border-violet-500/40 bg-violet-500/8",
  sky:     "border-sky-500/40   bg-sky-500/8",
  emerald: "border-emerald-500/40 bg-emerald-500/8",
  orange:  "border-orange-500/40 bg-orange-500/8",
};

const COLOR_DOT: Record<CollectionColor, string> = {
  zinc:    "bg-zinc-400",
  rose:    "bg-rose-400",
  amber:   "bg-amber-400",
  violet:  "bg-violet-400",
  sky:     "bg-sky-400",
  emerald: "bg-emerald-400",
  orange:  "bg-orange-400",
};

const COLOR_TEXT: Record<CollectionColor, string> = {
  zinc:    "text-zinc-300",
  rose:    "text-rose-300",
  amber:   "text-amber-300",
  violet:  "text-violet-300",
  sky:     "text-sky-300",
  emerald: "text-emerald-300",
  orange:  "text-orange-300",
};

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">

        {/* ── Header row ── */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Layers size={16} className="text-violet-400" />
              <h1 className="text-lg font-semibold text-zinc-100">Collections</h1>
            </div>
            <p className="text-xs text-zinc-500">
              Curated groups of articles for building, research, and content ideas.
            </p>
          </div>
          <CreateCollectionButton />
        </div>

        {/* ── Empty state ── */}
        {collections.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 py-20">
            <FolderPlus size={28} className="mb-3 text-zinc-600" />
            <p className="mb-1 text-sm font-medium text-zinc-400">No collections yet</p>
            <p className="mb-5 text-xs text-zinc-600">Create one to start organizing your articles.</p>
            <CreateCollectionButton label="Create first collection" />
          </div>
        )}

        {/* ── Collections grid ── */}
        {collections.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {collections.map((col) => {
              const color = col.color as CollectionColor;
              const count = col.articleCount ?? 0;
              return (
                <Link
                  key={col.id}
                  href={`/collections/${col.id}`}
                  className={clsx(
                    "group relative flex flex-col rounded-xl border p-5 transition-all hover:scale-[1.01]",
                    COLOR_RING[color] ?? COLOR_RING.zinc
                  )}
                >
                  {/* Dot + name */}
                  <div className="mb-2.5 flex items-center gap-2">
                    <span className={clsx("h-2.5 w-2.5 shrink-0 rounded-full", COLOR_DOT[color] ?? "bg-zinc-400")} />
                    <span className={clsx("text-sm font-semibold", COLOR_TEXT[color] ?? "text-zinc-300")}>
                      {col.name}
                    </span>
                  </div>

                  {/* Description */}
                  {col.description && (
                    <p className="mb-3 text-xs leading-relaxed text-zinc-500">
                      {col.description}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="mt-auto flex items-center gap-2 pt-1">
                    <FolderOpen size={11} className="text-zinc-600" />
                    <span className="text-[11px] text-zinc-600">
                      {count === 0 ? "No articles" : `${count} article${count !== 1 ? "s" : ""}`}
                    </span>
                  </div>

                  {/* Hover arrow */}
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-700 opacity-0 transition-opacity group-hover:opacity-100">
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
