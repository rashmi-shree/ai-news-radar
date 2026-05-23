"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import NewsCard, { type NewsItem } from "@/components/NewsCard";
import { Loader2, RefreshCw, Rss } from "lucide-react";

type Status = "loading" | "success" | "error" | "empty";

export default function FeedPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");

  function loadFeed() {
    setStatus("loading");
    fetch("/api/news")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ ok: boolean; items: NewsItem[] }>;
      })
      .then(({ items: fetched }) => {
        if (!fetched?.length) {
          setStatus("empty");
        } else {
          setItems(fetched);
          setStatus("success");
        }
      })
      .catch((err) => {
        console.error("[FeedPage]", err);
        setStatus("error");
      });
  }

  useEffect(() => {
    loadFeed();
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Header />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">Your feed</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {status === "success"
                ? `${items.length} items · sorted by newest`
                : "Fetching latest intelligence…"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {status === "success" && (
              <button
                onClick={loadFeed}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-600 hover:text-slate-100"
              >
                <RefreshCw size={12} />
                Refresh
              </button>
            )}

            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5">
              <span
                className={
                  status === "loading"
                    ? "h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse"
                    : status === "success"
                    ? "h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"
                    : "h-1.5 w-1.5 rounded-full bg-zinc-600"
                }
              />
              <span className="text-xs text-zinc-400">
                {status === "loading" ? "Fetching" : status === "success" ? "Live" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Loading */}
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <Loader2 size={28} className="animate-spin text-cyan-500" />
            <p className="text-sm text-zinc-400">Loading latest intelligence…</p>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
              <Rss size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-100">Failed to load feed</p>
              <p className="mt-1 text-xs text-zinc-500">
                Could not reach one or more sources.
              </p>
            </div>
            <button
              onClick={loadFeed}
              className="flex items-center gap-2 rounded-lg bg-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              <RefreshCw size={12} />
              Try again
            </button>
          </div>
        )}

        {/* Empty */}
        {status === "empty" && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
              <Rss size={20} className="text-zinc-600" />
            </div>
            <p className="text-sm text-zinc-400">No news available</p>
            <p className="text-xs text-zinc-600">Check back soon or refresh.</p>
          </div>
        )}

        {/* News grid */}
        {status === "success" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, i) => (
              <NewsCard key={`${item.link}-${i}`} item={item} />
            ))}
          </div>
        )}

        {status === "success" && (
          <p className="mt-10 text-center text-xs text-zinc-700">
            Sources: OpenAI · Anthropic · Hacker News · NVD CVE
          </p>
        )}
      </main>
    </div>
  );
}
