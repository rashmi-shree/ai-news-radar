import { getCollections, createCollection, type CollectionColor } from "@/src/lib/supabase/collections";

const VALID_COLORS = new Set<string>(["zinc","rose","amber","violet","sky","emerald","orange"]);

// ─── GET /api/collections ─────────────────────────────────────────────────────

export async function GET() {
  const collections = await getCollections();
  return Response.json({ ok: true, collections });
}

// ─── POST /api/collections ────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: { name?: string; description?: string | null; color?: string };
  try { body = await request.json(); }
  catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const name = body.name?.trim();
  if (!name) return Response.json({ ok: false, error: "name is required" }, { status: 400 });

  const color: CollectionColor = (body.color && VALID_COLORS.has(body.color))
    ? body.color as CollectionColor
    : "zinc";

  const result = await createCollection(name, body.description ?? null, color);
  if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 500 });

  return Response.json({ ok: true, collection: result.collection }, { status: 201 });
}
