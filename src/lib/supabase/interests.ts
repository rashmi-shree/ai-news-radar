import { supabase } from "./client";

const USER_ID = "local-user";

type InterestRow = { topic: string };

/**
 * Replaces the full interest set for the local user.
 * Deletes existing rows first, then inserts the new selection.
 */
export async function saveInterests(topics: string[]): Promise<void> {
  const { error: deleteError } = await supabase
    .from("user_interests")
    .delete()
    .eq("user_id", USER_ID);

  if (deleteError) {
    throw new Error(`[saveInterests] Delete failed: ${deleteError.message}`);
  }

  if (topics.length === 0) return;

  const rows = topics.map((topic) => ({ user_id: USER_ID, topic }));

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
export async function getInterests(): Promise<string[]> {
  const { data, error } = await supabase
    .from("user_interests")
    .select("topic")
    .eq("user_id", USER_ID);

  if (error) {
    console.error("[getInterests] Query failed:", error.message);
    return [];
  }

  return (data as InterestRow[]).map((r) => r.topic);
}

/**
 * Removes all stored interests for the local user.
 */
export async function clearInterests(): Promise<void> {
  const { error } = await supabase
    .from("user_interests")
    .delete()
    .eq("user_id", USER_ID);

  if (error) {
    throw new Error(`[clearInterests] Delete failed: ${error.message}`);
  }
}
