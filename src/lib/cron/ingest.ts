import { fetchAllFeeds, type FeedItem } from "../rss/fetchFeeds";
import { summarizeArticle } from "../ai/summarize";
import { classifyRisk } from "../ai/classify";
import {
  saveArticles,
  getAllExistingLinks,
  getLinksWithAISummary,
} from "../supabase/articles";

// ─── Types ────────────────────────────────────────────────────────────────────

export type IngestionResult = {
  ok: boolean;
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  aiSuccess: number;
  aiFailed: number;
  failedFeeds: number;
  durationMs: number;
};

// ─── HF enrichment (mirrors route.ts but used by the cron service) ────────────

async function enrichItem(item: FeedItem): Promise<{ item: FeedItem; ok: boolean }> {
  try {
    const { ai_summary, why_it_matters } = await summarizeArticle(
      item.summary || item.title,
      item.category
    );
    const risk_level = classifyRisk(item);

    return {
      ok: true,
      item: {
        ...item,
        intelligence: { ...item.intelligence, ai_summary, why_it_matters, risk_level },
      },
    };
  } catch (err) {
    console.error(
      `[AI SUMMARY] Failed for "${item.title.slice(0, 50)}":`,
      (err as Error).message
    );
    return { ok: false, item };
  }
}

// ─── Core ingestion pipeline ──────────────────────────────────────────────────

export async function runIngestion(): Promise<IngestionResult> {
  const start = Date.now();

  // ── 1. Fetch from all RSS + NVD sources ─────────────────────────────────
  let allItems: FeedItem[];
  try {
    allItems = await fetchAllFeeds();
  } catch (err) {
    console.error("[RSS FETCH] fetchAllFeeds threw:", (err as Error).message);
    allItems = [];
  }
  if (allItems.length === 0) {
    return { ok: true, fetched: 0, inserted: 0, updated: 0, skipped: 0, aiSuccess: 0, aiFailed: 0, failedFeeds: 0, durationMs: Date.now() - start };
  }

  const links = allItems.map((i) => i.link);

  // ── 2. Classify articles by DB presence ─────────────────────────────────
  const [existingLinks, linksWithSummary] = await Promise.all([
    getAllExistingLinks(links),
    getLinksWithAISummary(links),
  ]);

  const newItems        = allItems.filter((i) => !existingLinks.has(i.link));
  const needsSummary    = allItems.filter((i) =>  existingLinks.has(i.link) && !linksWithSummary.has(i.link));
  const alreadyComplete = allItems.filter((i) =>  linksWithSummary.has(i.link));

  // ── 3. HF enrichment for new + needs-summary ─────────────────────────────
  const toEnrich = [...newItems, ...needsSummary];
  let aiSuccess = 0;
  let aiFailed = 0;

  const enrichResults = await Promise.allSettled(
    toEnrich.map(async (item) => {
      const result = await enrichItem(item);
      if (result.ok) aiSuccess++;
      else aiFailed++;
      return result.item;
    })
  );

  const enrichedItems: FeedItem[] = enrichResults.map((r, i) =>
    r.status === "fulfilled" ? r.value : toEnrich[i]
  );

  // ── 4. Upsert everything ─────────────────────────────────────────────────
  // Scores are computed inside saveArticles → toDbRow for every article.
  const allToSave = [...enrichedItems, ...alreadyComplete];

  try {
    await saveArticles(allToSave);
  } catch (err) {
    console.error("[UPSERT] saveArticles failed:", (err as Error).message);
  }

  const durationMs = Date.now() - start;

  return {
    ok: true,
    fetched: allItems.length,
    inserted: newItems.length,
    updated: needsSummary.length,
    skipped: alreadyComplete.length,
    aiSuccess,
    aiFailed,
    failedFeeds: 0,
    durationMs,
  };
}
