import {
  getArticleCollectionIds,
  addArticleToCollection,
  removeArticleFromCollection,
  moveArticleBetweenCollections,
} from "@/src/lib/supabase/collections";

// ─── GET /api/collections/articles?articleId={id} ────────────────────────────
// Returns which collection IDs contain this article.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const articleId = searchParams.get("articleId");
  if (!articleId) return Response.json({ ok: false, error: "Missing articleId" }, { status: 400 });

  const collectionIds = await getArticleCollectionIds(articleId);
  return Response.json({ ok: true, collectionIds });
}

// ─── POST /api/collections/articles ──────────────────────────────────────────
// Add, remove, or move an article.
// Body: { action: "add"|"remove"|"move", collectionId, articleId, fromCollectionId? }

export async function POST(request: Request) {
  let body: {
    action:           "add" | "remove" | "move";
    collectionId?:    string;
    articleId?:       string;
    fromCollectionId?: string;
  };
  try { body = await request.json(); }
  catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const { action, collectionId, articleId, fromCollectionId } = body;

  if (!action || !articleId) {
    return Response.json({ ok: false, error: "action and articleId are required" }, { status: 400 });
  }

  if (action === "add") {
    if (!collectionId) return Response.json({ ok: false, error: "collectionId required" }, { status: 400 });
    const result = await addArticleToCollection(collectionId, articleId);
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (action === "remove") {
    if (!collectionId) return Response.json({ ok: false, error: "collectionId required" }, { status: 400 });
    const result = await removeArticleFromCollection(collectionId, articleId);
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (action === "move") {
    if (!fromCollectionId || !collectionId) {
      return Response.json({ ok: false, error: "fromCollectionId and collectionId required" }, { status: 400 });
    }
    const result = await moveArticleBetweenCollections(fromCollectionId, collectionId, articleId);
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 500 });
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false, error: "action must be add | remove | move" }, { status: 400 });
}
