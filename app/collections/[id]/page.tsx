import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FolderOpen, Layers } from "lucide-react";
import { clsx } from "clsx";
import Header from "@/components/Header";
import NewsCard from "@/components/NewsCard";
import {
  getCollectionById,
  getCollectionArticleIds,
  type CollectionColor,
} from "@/src/lib/supabase/collections";
import { getArticlesByIds } from "@/src/lib/supabase/articles";
import { getServerUserId } from "@/src/lib/supabase/server";
import type { NewsItem } from "@/components/NewsCard";
import type { FeedItem } from "@/src/lib/rss/fetchFeeds";
import type { SummaryResult } from "@/src/lib/ai/types";
import DeleteCollectionButton from "@/components/DeleteCollectionButton";

// ─── Color helpers ────────────────────────────────────────────────────────────

const COLOR_BAR: Record<CollectionColor, string> = {
  zinc:    "bg-zinc-600",
  rose:    "bg-rose-500",
  amber:   "bg-amber-500",
  violet:  "bg-violet-500",
  sky:     "bg-sky-500",
  emerald: "bg-emerald-500",
  orange:  "bg-orange-500",
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

const COLOR_DOT: Record<CollectionColor, string> = {
  zinc:    "bg-zinc-400",
  rose:    "bg-rose-400",
  amber:   "bg-amber-400",
  violet:  "bg-violet-400",
  sky:     "bg-sky-400",
  emerald: "bg-emerald-400",
  orange:  "bg-orange-400",
};

// ─── FeedItem → NewsItem mapper ───────────────────────────────────────────────

function toNewsItem(item: FeedItem): NewsItem {
  const intelligence: SummaryResult = item.intelligence ?? {
    ai_summary:     item.summary,
    why_it_matters: "",
    risk_level:     "low",
  };
  return {
    id:             item.id ?? item.link,
    title:          item.title,
    summary:        intelligence.ai_summary || item.summary,
    source:         item.source,
    category:       item.category,
    publishedAt:    item.publishedAt,
    link:           item.link,
    signal:         item.signal as NewsItem["signal"],
    relevanceScore: item.relevanceScore ?? 0,
    intelligence,
    builderScore:   item.builderScore,
    scoreBreakdown: item.scoreBreakdown,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Ctx = { params: Promise<{ id: string }> };

export default async function CollectionDetailPage({ params }: Ctx) {
  const userId = await getServerUserId();
  const { id } = await params;

  const collection = await getCollectionById(userId, id);
  if (!collection) notFound();

  const articleIds = await getCollectionArticleIds(userId, id);
  const articleMap = await getArticlesByIds(articleIds);

  // Preserve the order returned by getCollectionArticleIds (newest added first)
  const articles = articleIds
    .map((aid) => articleMap.get(aid))
    .filter(Boolean) as FeedItem[];

  const color = collection.color as CollectionColor;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />

      {/* Accent bar */}
      <div className={clsx("h-0.5 w-full", COLOR_BAR[color] ?? "bg-zinc-600")} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">

        {/* ── Back ── */}
        <Link
          href="/collections"
          className="mb-6 flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300"
        >
          <ArrowLeft size={12} />
          All collections
        </Link>

        {/* ── Header ── */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2.5">
              <span className={clsx("h-3 w-3 shrink-0 rounded-full", COLOR_DOT[color] ?? "bg-zinc-400")} />
              <h1 className={clsx("text-xl font-bold", COLOR_TEXT[color] ?? "text-zinc-100")}>
                {collection.name}
              </h1>
            </div>
            {collection.description && (
              <p className="ml-5 text-xs text-zinc-500">{collection.description}</p>
            )}
            <p className="ml-5 mt-1 text-[11px] text-zinc-600">
              {articles.length === 0
                ? "No articles yet"
                : `${articles.length} article${articles.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <DeleteCollectionButton collectionId={id} />
        </div>

        {/* ── Articles ── */}
        {articles.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/40 py-20">
            <FolderOpen size={28} className="mb-3 text-zinc-700" />
            <p className="mb-1 text-sm font-medium text-zinc-500">Collection is empty</p>
            <p className="text-xs text-zinc-600">
              Open any article and use{" "}
              <span className="font-semibold text-zinc-400">Add to Collection</span> to save it here.
            </p>
          </div>
        )}

        {articles.length > 0 && (
          <div className="flex flex-col gap-3">
            {articles.map((item) => (
              <NewsCard key={item.id ?? item.link} item={toNewsItem(item)} />
            ))}
          </div>
        )}

        {/* ── Footer ── */}
        {articles.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-2 text-[11px] text-zinc-700">
            <Layers size={11} />
            <Link href="/collections" className="hover:text-zinc-400">
              Back to all collections
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
