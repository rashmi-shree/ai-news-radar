import {
  getCollectionById,
  getCollectionArticleIds,
  updateCollection,
  deleteCollection,
  type CollectionColor,
} from "@/src/lib/supabase/collections";
import { getArticlesByIds } from "@/src/lib/supabase/articles";
import { getServerUser } from "@/src/lib/supabase/server";

const VALID_COLORS = new Set<string>(["zinc","rose","amber","violet","sky","emerald","orange"]);

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const user = await getServerUser();
  if (!user) return Response.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const collection = await getCollectionById(user.id, id);
  if (!collection) return Response.json({ ok: false, error: "Not found" }, { status: 404 });

  const articleIds = await getCollectionArticleIds(user.id, id);
  const articles   = articleIds.length > 0 ? await getArticlesByIds(articleIds) : [];

  return Response.json({ ok: true, collection, articles });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const user = await getServerUser();
  if (!user) return Response.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  let body: { name?: string; description?: string | null; color?: string };
  try { body = await request.json(); }
  catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const updates: Parameters<typeof updateCollection>[2] = {};
  if (body.name !== undefined)        updates.name        = body.name.trim();
  if (body.description !== undefined) updates.description = body.description;
  if (body.color && VALID_COLORS.has(body.color)) {
    updates.color = body.color as CollectionColor;
  }

  const result = await updateCollection(user.id, id, updates);
  if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const user = await getServerUser();
  if (!user) return Response.json({ ok: false, error: "Unauthenticated" }, { status: 401 });

  const { id } = await params;
  const result = await deleteCollection(user.id, id);
  if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 500 });
  return Response.json({ ok: true });
}
