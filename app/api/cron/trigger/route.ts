import { runIngestion } from "@/src/lib/cron/ingest";

/**
 * POST /api/cron/trigger
 *
 * No-auth manual trigger for the "Sync Now" button in the feed UI.
 * This is intentionally separate from /api/cron/ingest so the CRON_SECRET
 * is never required or exposed on the client side.
 *
 * Rate-limit this route in production if needed.
 */
export async function POST() {
  try {
    const result = await runIngestion();
    return Response.json(result);
  } catch (err) {
    console.error("[CRON TRIGGER] Unhandled error:", (err as Error).message);
    return Response.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
