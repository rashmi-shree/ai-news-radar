import { getDigestData } from "@/src/lib/supabase/digest";
import { getServerUser } from "@/src/lib/supabase/server";

export async function GET() {
  const user = await getServerUser();
  if (!user) return Response.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  try {
    const data = await getDigestData(user.id);
    return Response.json({ ok: true, digest: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[DIGEST] failed:", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
