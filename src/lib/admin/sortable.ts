import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Swaps a row with its neighbour in `sort` order.
 *
 * Returns `true` when the requested reorder is done (including the legitimate
 * no-op of moving the first row up or the last row down), `false` when any
 * Supabase response carried an error or the row could not be found. Callers
 * MUST react to `false` — every write here is silently rejected by RLS if the
 * caller isn't the owner, and reporting "Saved." over a rejected write is
 * exactly the bug this signature exists to prevent.
 */
export async function moveItem(
  supabase: SupabaseClient,
  table: string,
  id: string,
  direction: "up" | "down",
): Promise<boolean> {
  const { data: rows, error: selectError } = await supabase
    .from(table).select("id, sort").order("sort");
  if (selectError || !rows) return false;

  const idx = rows.findIndex((r) => r.id === id);
  // The row the owner just clicked isn't in the table — deleted in another tab,
  // or hidden from this caller by RLS. Either way the reorder did not happen.
  if (idx < 0) return false;

  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  // Already at the end it was asked to move toward: nothing to do, not a failure.
  if (swapWith < 0 || swapWith >= rows.length) return true;

  const a = rows[idx];
  const b = rows[swapWith];
  // Rows can share a `sort` value (everything defaults to 0, and `nextSort`
  // only guarantees uniqueness for rows it created). Plain "swap the two
  // values" would then be a no-op, so on a tie we step `a` one past `b` in the
  // requested direction and hand `b` the value `a` used to hold.
  const aSort = b.sort === a.sort ? a.sort + (direction === "up" ? -1 : 1) : b.sort;

  const { error: firstError } = await supabase.from(table).update({ sort: aSort }).eq("id", a.id);
  if (firstError) return false;
  const { error: secondError } = await supabase.from(table).update({ sort: a.sort }).eq("id", b.id);
  if (secondError) return false;

  return true;
}

/**
 * Next free `sort` value for a table. Throws on a failed read rather than
 * quietly returning 0 and stacking every new row at the top —
 * `withAdminAction` turns the throw into the standard error banner.
 */
export async function nextSort(supabase: SupabaseClient, table: string): Promise<number> {
  const { data, error } = await supabase
    .from(table).select("sort").order("sort", { ascending: false }).limit(1);
  if (error) throw error;
  return (data?.[0]?.sort ?? -1) + 1;
}
