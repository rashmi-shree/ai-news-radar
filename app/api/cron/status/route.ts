import { getIngestionStatus } from "@/src/lib/supabase/articles";

/**
 * GET /api/cron/status
 *
 * Returns a health snapshot of the ingestion pipeline.
 * Protected with the same CRON_SECRET as /api/cron/ingest.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  try {
    const { articleCount, lastIngested, latestArticle } = await getIngestionStatus();

    return Response.json({
      ok: true,
      articleCount,
      lastIngested,
      latestArticle,
    });
  } catch (err) {
    console.error("[CRON STATUS] Error:", (err as Error).message);
    return Response.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
