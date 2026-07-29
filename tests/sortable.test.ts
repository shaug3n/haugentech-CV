import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { moveItem, nextSort } from "@/lib/admin/sortable";

type Row = { id: string; sort: number };
type Update = { id: string; sort: number };

interface FakeOptions {
  /** Error returned by the initial `select(...).order(...)`. */
  selectError?: unknown;
  /** 1-based index of the `update()` call that should fail. */
  failUpdateNumber?: number;
  /**
   * 1-based index of the `update()` call that should succeed with no error
   * but affect zero rows — simulating an RLS `USING` clause filtering the row
   * out (e.g. `is_site_owner()` no longer matches the caller) rather than
   * rejecting the write outright.
   */
  filterUpdateNumber?: number;
}

/**
 * Minimal stand-in for the slice of the Supabase client `sortable.ts` touches:
 *   from(t).select(cols).order(col)                        -> { data, error }
 *   from(t).select(cols).order(col, opts).limit(n)         -> { data, error }
 *   from(t).update(values).eq("id", id).select("id")       -> { data, error }
 * It records every update that actually took effect so tests can assert the
 * exact sort values written, and can inject an error into the select, an
 * error into the Nth update, or a "succeeded but affected zero rows" response
 * into the Nth update (an RLS `USING` clause filtering the row rather than
 * rejecting the write).
 */
function makeFakeClient(rows: Row[], options: FakeOptions = {}) {
  const updates: Update[] = [];
  let updateCount = 0;

  const selectResult = options.selectError
    ? { data: null, error: options.selectError }
    : { data: rows, error: null };

  const client = {
    from() {
      return {
        select() {
          return {
            order() {
              return {
                // `moveItem` awaits the result of `.order(...)` directly, while
                // `nextSort` chains `.limit(1)` onto it. Being both a thenable
                // and a chainable object covers the two call shapes.
                limit: () => Promise.resolve(selectResult),
                then: (resolve: (value: unknown) => unknown) => Promise.resolve(selectResult).then(resolve),
              };
            },
          };
        },
        update(values: { sort: number }) {
          return {
            eq(_column: string, id: string) {
              updateCount += 1;
              const shouldFail = options.failUpdateNumber === updateCount;
              const shouldFilter = options.filterUpdateNumber === updateCount;
              return {
                select: () => {
                  if (shouldFail) return Promise.resolve({ data: null, error: { message: "rejected" } });
                  if (shouldFilter) return Promise.resolve({ data: [], error: null });
                  updates.push({ id, sort: values.sort });
                  return Promise.resolve({ data: [{ id }], error: null });
                },
              };
            },
          };
        },
      };
    },
  };

  return { supabase: client as unknown as SupabaseClient, updates };
}

const THREE_ROWS: Row[] = [
  { id: "a", sort: 0 },
  { id: "b", sort: 1 },
  { id: "c", sort: 2 },
];

describe("moveItem", () => {
  it("moves an item up by swapping sort values with its predecessor", async () => {
    const { supabase, updates } = makeFakeClient(THREE_ROWS);
    expect(await moveItem(supabase, "experience", "b", "up")).toBe(true);
    // b takes a's slot (0), a takes b's old slot (1).
    expect(updates).toEqual([
      { id: "b", sort: 0 },
      { id: "a", sort: 1 },
    ]);
  });

  it("moves an item down by swapping sort values with its successor", async () => {
    const { supabase, updates } = makeFakeClient(THREE_ROWS);
    expect(await moveItem(supabase, "experience", "b", "down")).toBe(true);
    expect(updates).toEqual([
      { id: "b", sort: 2 },
      { id: "c", sort: 1 },
    ]);
  });

  it("is a successful no-op when the first item is moved up", async () => {
    const { supabase, updates } = makeFakeClient(THREE_ROWS);
    expect(await moveItem(supabase, "experience", "a", "up")).toBe(true);
    expect(updates).toEqual([]);
  });

  it("is a successful no-op when the last item is moved down", async () => {
    const { supabase, updates } = makeFakeClient(THREE_ROWS);
    expect(await moveItem(supabase, "experience", "c", "down")).toBe(true);
    expect(updates).toEqual([]);
  });

  it("reports failure when the id is not in the table", async () => {
    const { supabase, updates } = makeFakeClient(THREE_ROWS);
    expect(await moveItem(supabase, "experience", "missing", "up")).toBe(false);
    expect(updates).toEqual([]);
  });

  it("reports failure when the select errors instead of pretending it reordered", async () => {
    const { supabase, updates } = makeFakeClient(THREE_ROWS, {
      selectError: { message: "permission denied" },
    });
    expect(await moveItem(supabase, "experience", "b", "up")).toBe(false);
    expect(updates).toEqual([]);
  });

  it("reports failure when the FIRST write is rejected", async () => {
    // Regression guard: both writes used to be unchecked, so an RLS rejection
    // still redirected to "?status=saved".
    const { supabase, updates } = makeFakeClient(THREE_ROWS, { failUpdateNumber: 1 });
    expect(await moveItem(supabase, "experience", "b", "up")).toBe(false);
    // ...and it must not carry on and half-apply the swap.
    expect(updates).toEqual([]);
  });

  it("reports failure when the SECOND write is rejected", async () => {
    const { supabase, updates } = makeFakeClient(THREE_ROWS, { failUpdateNumber: 2 });
    expect(await moveItem(supabase, "experience", "b", "up")).toBe(false);
    expect(updates).toEqual([{ id: "b", sort: 0 }]);
  });

  it("reports failure when the FIRST write succeeds but matches zero rows (RLS-filtered)", async () => {
    // Regression guard for the RLS-filter gap: PostgREST reports
    // `{ data: [], error: null }` when the USING clause hides the row from an
    // UPDATE, not an error. `moveItem` must still treat that as a failure.
    const { supabase, updates } = makeFakeClient(THREE_ROWS, { filterUpdateNumber: 1 });
    expect(await moveItem(supabase, "experience", "b", "up")).toBe(false);
    expect(updates).toEqual([]);
  });

  it("reports failure when the SECOND write succeeds but matches zero rows (RLS-filtered)", async () => {
    const { supabase, updates } = makeFakeClient(THREE_ROWS, { filterUpdateNumber: 2 });
    expect(await moveItem(supabase, "experience", "b", "up")).toBe(false);
    // The first write did take effect — it just never got a chance to be undone.
    expect(updates).toEqual([{ id: "b", sort: 0 }]);
  });

  describe("tie-breaking when neighbours share a sort value", () => {
    // Every row defaults to sort 0, so ties are the normal state of a table
    // whose rows were inserted before `nextSort` existed (or by hand in the SQL
    // editor). A plain value swap would be a no-op and the arrows would look
    // broken.
    const TIED: Row[] = [
      { id: "a", sort: 5 },
      { id: "b", sort: 5 },
      { id: "c", sort: 5 },
    ];

    it("steps the moved row one BELOW its predecessor when moving up", async () => {
      const { supabase, updates } = makeFakeClient(TIED);
      expect(await moveItem(supabase, "skills", "b", "up")).toBe(true);
      expect(updates).toEqual([
        { id: "b", sort: 4 },
        { id: "a", sort: 5 },
      ]);
    });

    it("steps the moved row one ABOVE its successor when moving down", async () => {
      const { supabase, updates } = makeFakeClient(TIED);
      expect(await moveItem(supabase, "skills", "b", "down")).toBe(true);
      expect(updates).toEqual([
        { id: "b", sort: 6 },
        { id: "c", sort: 5 },
      ]);
    });
  });
});

describe("nextSort", () => {
  it("returns one past the highest existing sort value", async () => {
    // The fake returns rows in the order given; nextSort reads element 0, which
    // in production is the highest because of `order("sort", desc).limit(1)`.
    const { supabase } = makeFakeClient([{ id: "c", sort: 7 }]);
    expect(await nextSort(supabase, "experience")).toBe(8);
  });

  it("returns 0 for an empty table", async () => {
    const { supabase } = makeFakeClient([]);
    expect(await nextSort(supabase, "experience")).toBe(0);
  });

  it("throws on a failed read rather than silently returning 0", async () => {
    const { supabase } = makeFakeClient([], { selectError: { message: "permission denied" } });
    await expect(nextSort(supabase, "experience")).rejects.toBeTruthy();
  });
});
