import { fetchAllFeeds, type FeedItem } from "@/src/lib/rss/fetchFeeds";
import {
  getArticles,
  saveArticles,
  getLinksWithAISummary,
} from "@/src/lib/supabase/articles";
import { summarizeArticle } from "@/src/lib/ai/summarize";
import { classifyRisk } from "@/src/lib/ai/classify";

// ─── HF enrichment ────────────────────────────────────────────────────────────
// Replaces rule-based intelligence with HF-generated ai_summary + classifyRisk.
// Skips articles that already have an AI summary stored in Supabase.

async function enrichItem(item: FeedItem): Promise<FeedItem> {
  try {
    const { ai_summary, why_it_matters } = await summarizeArticle(
      item.summary || item.title,
      item.category
    );
    const risk_level = classifyRisk(item);

    return {
      ...item,
      intelligence: { ...item.intelligence, ai_summary, why_it_matters, risk_level },
    };
  } catch (err) {
    console.error(
      `[HF SUMMARY] enrichItem failed for "${item.title.slice(0, 50)}":`,
      (err as Error).message
    );
    return item;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // ── 1. DB-first: serve cached articles if available ───────────────────
    const cached = await getArticles();
    if (cached.length > 0) {
      return Response.json({ ok: true, source: "db", count: cached.length, items: cached });
    }

    // ── 2. Cold path: fetch and process RSS + NVD ─────────────────────────
    const items = await fetchAllFeeds();

    if (items.length === 0) {
      return Response.json({ ok: true, source: "rss", count: 0, items: [] });
    }

    // ── 3. Cost control: skip articles that already have summaries ───────────
    const links = items.map((i) => i.link);
    const alreadySummarised = await getLinksWithAISummary(links);

    // ── 4. HF enrichment — run in parallel with allSettled ────────────────
    const enrichResults = await Promise.allSettled(
      items.map((item) => {
        if (alreadySummarised.has(item.link)) return Promise.resolve(item);
        return enrichItem(item);
      })
    );

    const enriched: FeedItem[] = enrichResults.map((r, i) =>
      r.status === "fulfilled" ? r.value : items[i]
    );

    // ── 5. Persist to Supabase (scores computed inside saveArticles) ──────
    // saveArticles → toDbRow calls computeThreatScore for every article.
    let withIds = enriched;
    try {
      const idMap = await saveArticles(enriched);
      withIds = enriched.map((item) => ({
        ...item,
        id: idMap.get(item.link) ?? item.id,
      }));
    } catch {
      console.error("[DB INSERT] Save failed; returning enriched data without persisting");
    }

    return Response.json({ ok: true, source: "rss", count: withIds.length, items: withIds });
  } catch (error) {
    console.error("[GET /api/news]", error);
    return Response.json(
      { ok: false, error: "Failed to fetch news." },
      { status: 500 }
    );
  }
}
