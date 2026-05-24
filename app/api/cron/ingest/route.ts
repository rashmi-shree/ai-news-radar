import { runIngestion } from "@/src/lib/cron/ingest";

/**
 * POST /api/cron/ingest
 *
 * Auth-protected ingestion endpoint called by Vercel Cron Scheduler.
 * Requires: Authorization: Bearer <CRON_SECRET>
 *
 * Vercel automatically sends:
 *   Authorization: Bearer <CRON_SECRET>
 * when configured in vercel.json.
 */
export async function POST(request: Request) {
  // ── Auth guard — CRON_SECRET is required in all environments ────────────
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[CRON INGEST] CRON_SECRET env var is not set — refusing request");
    return Response.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    console.warn("[CRON INGEST] Unauthorized request rejected");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runIngestion();
    return Response.json(result);
  } catch (err) {
    console.error("[CRON INGEST] Unhandled error:", (err as Error).message);
    return Response.json(
      { ok: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

// Allow Vercel cron to call this as GET as well (some schedulers use GET)
export async function GET(request: Request) {
  return POST(request);
}
