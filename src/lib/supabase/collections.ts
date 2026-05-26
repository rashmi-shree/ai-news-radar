import { supabase } from "./client";


// ─── Types ────────────────────────────────────────────────────────────────────

export type CollectionColor =
  | "zinc" | "rose" | "amber" | "violet" | "sky" | "emerald" | "orange";

export interface UserCollection {
  id:          string;
  userId:      string;
  name:        string;
  description: string | null;
  color:       CollectionColor;
  createdAt:   string;
  updatedAt:   string;
  articleCount?: number;
}

export interface CollectionArticle {
  collectionId: string;
  articleId:    string;
  addedAt:      string;
}

// ─── Collection CRUD ─────────────────────────────────────────────────────────

export async function getCollections(userId: string): Promise<UserCollection[]> {
  const { data, error } = await supabase
    .from("user_collections")
    .select(`
      id, user_id, name, description, color, created_at, updated_at,
      collection_articles(count)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return (data as Array<{
    id:          string;
    user_id:     string;
    name:        string;
    description: string | null;
    color:       CollectionColor;
    created_at:  string;
    updated_at:  string;
    collection_articles: Array<{ count: number }>;
  }>).map((row) => ({
    id:          row.id,
    userId:      row.user_id,
    name:        row.name,
    description: row.description,
    color:       row.color,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
    articleCount: (row.collection_articles?.[0] as unknown as { count: number } | undefined)?.count ?? 0,
  }));
}

export async function getCollectionById(userId: string, id: string): Promise<UserCollection | null> {
  const { data, error } = await supabase
    .from("user_collections")
    .select("id, user_id, name, description, color, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as {
    id:          string;
    user_id:     string;
    name:        string;
    description: string | null;
    color:       CollectionColor;
    created_at:  string;
    updated_at:  string;
  };

  return {
    id:          row.id,
    userId:      row.user_id,
    name:        row.name,
    description: row.description,
    color:       row.color,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

export async function createCollection(userId: string,
  name:        string,
  description: string | null = null,
  color:       CollectionColor = "zinc"
): Promise<{ ok: boolean; collection?: UserCollection; error?: string }> {
  const { data, error } = await supabase
    .from("user_collections")
    .insert({ user_id: userId, name: name.trim(), description, color })
    .select("id, user_id, name, description, color, created_at, updated_at")
    .single();

  if (error || !data) return { ok: false, error: error?.message };

  const row = data as {
    id:          string;
    user_id:     string;
    name:        string;
    description: string | null;
    color:       CollectionColor;
    created_at:  string;
    updated_at:  string;
  };

  return {
    ok: true,
    collection: {
      id:          row.id,
      userId:      row.user_id,
      name:        row.name,
      description: row.description,
      color:       row.color,
      createdAt:   row.created_at,
      updatedAt:   row.updated_at,
      articleCount: 0,
    },
  };
}

export async function updateCollection(userId: string,
  id:      string,
  updates: { name?: string; description?: string | null; color?: CollectionColor }
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("user_collections")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteCollection(userId: string, id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("user_collections")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ─── Article membership ───────────────────────────────────────────────────────

/** Which collection IDs contain a given article (for this user). */
export async function getArticleCollectionIds(userId: string, articleId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("collection_articles")
    .select("collection_id")
    .eq("article_id", articleId)
    .eq("user_id", userId);

  if (error || !data) return [];
  return (data as Array<{ collection_id: string }>).map((r) => r.collection_id);
}

/** Articles inside a collection, newest first. Returns minimal article rows. */
export async function getCollectionArticleIds(userId: string, collectionId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("collection_articles")
    .select("article_id")
    .eq("collection_id", collectionId)
    .eq("user_id", userId)
    .order("added_at", { ascending: false });

  if (error || !data) return [];
  return (data as Array<{ article_id: string }>).map((r) => r.article_id);
}

export async function addArticleToCollection(userId: string,
  collectionId: string,
  articleId:    string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("collection_articles")
    .upsert(
      { collection_id: collectionId, article_id: articleId, user_id: userId },
      { onConflict: "collection_id,article_id" }
    );

  if (error) return { ok: false, error: error.message };

  // Bump collection updated_at
  await supabase
    .from("user_collections")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", collectionId);

  return { ok: true };
}

export async function removeArticleFromCollection(userId: string,
  collectionId: string,
  articleId:    string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("collection_articles")
    .delete()
    .eq("collection_id", collectionId)
    .eq("article_id",    articleId)
    .eq("user_id",       userId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Move: removes from fromId, adds to toId — atomic via sequential calls. */
export async function moveArticleBetweenCollections(userId: string,
  fromCollectionId: string,
  toCollectionId:   string,
  articleId:        string
): Promise<{ ok: boolean; error?: string }> {
  const rem = await removeArticleFromCollection(userId, fromCollectionId, articleId);
  if (!rem.ok) return rem;
  return addArticleToCollection(userId, toCollectionId, articleId);
}
