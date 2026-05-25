import {
  getCollectionById,
  getCollectionArticleIds,
  updateCollection,
  deleteCollection,
  type CollectionColor,
} from "@/src/lib/supabase/collections";
import { getArticlesByIds } from "@/src/lib/supabase/articles";

const VALID_COLORS = new Set<string>(["zinc","rose","amber","violet","sky","emerald","orange"]);

type Ctx = { params: Promise<{ id: string }> };

// ─── GET /api/collections/[id] ────────────────────────────────────────────────
// Returns collection + its articles.

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const collection = await getCollectionById(id);
  if (!collection) return Response.json({ ok: false, error: "Not found" }, { status: 404 });

  const articleIds = await getCollectionArticleIds(id);
  const articles   = articleIds.length > 0 ? await getArticlesByIds(articleIds) : [];

  return Response.json({ ok: true, collection, articles });
}

// ─── PATCH /api/collections/[id] ─────────────────────────────────────────────
// Updates collection name / description / color.

export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  let body: { name?: string; description?: string | null; color?: string };
  try { body = await request.json(); }
  catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const updates: Parameters<typeof updateCollection>[1] = {};
  if (body.name !== undefined)        updates.name        = body.name.trim();
  if (body.description !== undefined) updates.description = body.description;
  if (body.color && VALID_COLORS.has(body.color)) {
    updates.color = body.color as CollectionColor;
  }

  const result = await updateCollection(id, updates);
  if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 500 });
  return Response.json({ ok: true });
}

// ─── DELETE /api/collections/[id] ────────────────────────────────────────────

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const result = await deleteCollection(id);
  if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 500 });
  return Response.json({ ok: true });
}
