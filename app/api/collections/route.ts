import { getCollections, createCollection, type CollectionColor } from "@/src/lib/supabase/collections";
import { getServerUser } from "@/src/lib/supabase/server";

const VALID_COLORS = new Set<string>(["zinc","rose","amber","violet","sky","emerald","orange"]);

export async function GET() {
  const user = await getServerUser();
  if (!user) return Response.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  const collections = await getCollections(user.id);
  return Response.json({ ok: true, collections });
}

export async function POST(request: Request) {
  const user = await getServerUser();
  if (!user) return Response.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  let body: { name?: string; description?: string | null; color?: string };
  try { body = await request.json(); }
  catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const name = body.name?.trim();
  if (!name) return Response.json({ ok: false, error: "name is required" }, { status: 400 });

  const color: CollectionColor = (body.color && VALID_COLORS.has(body.color))
    ? body.color as CollectionColor
    : "zinc";

  const result = await createCollection(user.id, name, body.description ?? null, color);
  if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 500 });

  return Response.json({ ok: true, collection: result.collection }, { status: 201 });
}
