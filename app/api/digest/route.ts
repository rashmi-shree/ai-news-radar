import { getDigestData } from "@/src/lib/supabase/digest";

export async function GET() {
  try {
    const data = await getDigestData();
    return Response.json({ ok: true, digest: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[DIGEST] failed:", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
