import { supabase } from "./client";


type InterestRow = { topic: string };

/**
 * Replaces the full interest set for the local user.
 * Deletes existing rows first, then inserts the new selection.
 */
export async function saveInterests(userId: string, topics: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from("user_interests")
    .delete()
    .eq("user_id", userId);

  if (deleteError) {
    throw new Error(`[saveInterests] Delete failed: ${deleteError.message}`);
  }

  if (topics.length === 0) return;

  const rows = topics.map((topic) => ({ user_id: userId, topic }));

  const { error: insertError } = await supabase
    .from("user_interests")
    .insert(rows);

  if (insertError) {
    throw new Error(`[saveInterests] Insert failed: ${insertError.message}`);
  }
}

/**
 * Loads stored interests for the local user.
 * Returns an empty array on error rather than throwing.
 */
export async function getInterests(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_interests")
    .select("topic")
    .eq("user_id", userId);

  if (error) {
    console.error("[getInterests] Query failed:", error.message);
    return [];
  }

  return (data as InterestRow[]).map((r) => r.topic);
}

/**
 * Removes all stored interests for the local user.
 */
export async function clearInterests(userId: string): Promise<void> {
  const { error } = await supabase
    .from("user_interests")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(`[clearInterests] Delete failed: ${error.message}`);
  }
}
