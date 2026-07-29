import type { SupabaseClient } from "@supabase/supabase-js";

export async function moveItem(
  supabase: SupabaseClient,
  table: string,
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const { data: rows } = await supabase.from(table).select("id, sort").order("sort");
  if (!rows) return;
  const idx = rows.findIndex((r) => r.id === id);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapWith < 0 || swapWith >= rows.length) return;
  const a = rows[idx];
  const b = rows[swapWith];
  await supabase.from(table).update({ sort: b.sort === a.sort ? a.sort + (direction === "up" ? -1 : 1) : b.sort }).eq("id", a.id);
  await supabase.from(table).update({ sort: a.sort }).eq("id", b.id);
}

export async function nextSort(supabase: SupabaseClient, table: string): Promise<number> {
  const { data } = await supabase.from(table).select("sort").order("sort", { ascending: false }).limit(1);
  return (data?.[0]?.sort ?? -1) + 1;
}
