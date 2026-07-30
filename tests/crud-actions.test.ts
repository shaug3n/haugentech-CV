import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Proves the finding this factory exists to fix: a rejected Supabase write must
 * land on `?status=error`, never on `?status=saved`. Before the refactor every
 * delete and both writes inside a reorder threw their `error` away and reported
 * success regardless.
 *
 * The Supabase client and `next/cache` are stubbed; `redirect` is the real one,
 * so assertions read the NEXT_REDIRECT digest exactly as the browser would see
 * the resulting Location.
 */

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

type Row = { id: string; sort: number };

interface Injected {
  insertError?: unknown;
  updateError?: unknown;
  deleteError?: unknown;
  selectError?: unknown;
  /** 1-based index of the update() call to fail — for the two writes in a move. */
  failUpdateNumber?: number;
  /**
   * Simulates an RLS-filtered write: no error, but the row simply isn't
   * visible to the query (e.g. `is_site_owner()`'s hardcoded email drifted
   * from `ADMIN_EMAIL`). PostgREST reports this as `{ data: [], error: null }`,
   * not an error — the case `.select("id")` + a length check exists to catch.
   */
  updateFiltered?: boolean;
  deleteFiltered?: boolean;
  /** 1-based index of the update() call to report as RLS-filtered — for move. */
  filterUpdateNumber?: number;
}

let rows: Row[] = [];
let injected: Injected = {};
let updateCalls = 0;
let ownerEmail: string | null = "owner@example.com";

const fakeClient = {
  auth: {
    getUser: async () => ({ data: { user: ownerEmail ? { email: ownerEmail } : null } }),
  },
  from() {
    return {
      select() {
        const result = injected.selectError
          ? { data: null, error: injected.selectError }
          : { data: rows, error: null };
        return {
          order: () => ({
            limit: () => Promise.resolve(result),
            then: (r: (v: unknown) => unknown) => Promise.resolve(result).then(r),
          }),
        };
      },
      insert: () => Promise.resolve({ error: injected.insertError ?? null }),
      update: () => ({
        eq: () => ({
          select: () => {
            updateCalls += 1;
            const fail = injected.updateError
              ?? (injected.failUpdateNumber === updateCalls ? { message: "rejected" } : null);
            if (fail) return Promise.resolve({ data: null, error: fail });
            const filtered = injected.updateFiltered || injected.filterUpdateNumber === updateCalls;
            return Promise.resolve({ data: filtered ? [] : [{ id: "row" }], error: null });
          },
        }),
      }),
      delete: () => ({
        eq: () => ({
          select: () => {
            if (injected.deleteError) return Promise.resolve({ data: null, error: injected.deleteError });
            return Promise.resolve({ data: injected.deleteFiltered ? [] : [{ id: "row" }], error: null });
          },
        }),
      }),
    };
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: async () => fakeClient,
}));

const { createCrudActions } = await import("@/lib/admin/crud-actions");
const { experienceSchema } = await import("@/lib/schemas");

const actions = createCrudActions({
  table: "experience",
  path: "/admin/experience",
  schema: experienceSchema,
  sortable: true,
});

/** Runs an action and returns the path it redirected to. */
async function destinationOf(run: () => Promise<void>): Promise<string> {
  try {
    await run();
  } catch (err) {
    const digest = (err as { digest?: string }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
      // digest is "NEXT_REDIRECT;<replace|push>;<url>;<status>;"
      const url = digest.split(";").find((part) => part.startsWith("/"));
      if (!url) throw new Error(`no url in redirect digest: ${digest}`);
      return url;
    }
    throw err;
  }
  throw new Error("action returned without redirecting");
}

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const VALID = { company: "Acme AS", role_en: "Engineer" };

describe("createCrudActions error handling", () => {
  beforeEach(() => {
    rows = [{ id: "a", sort: 0 }, { id: "b", sort: 1 }, { id: "c", sort: 2 }];
    injected = {};
    updateCalls = 0;
    ownerEmail = "owner@example.com";
    process.env.ADMIN_EMAIL = "owner@example.com";
    revalidatePath.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("create", () => {
    it("redirects to ?status=saved and revalidates on success", async () => {
      expect(await destinationOf(() => actions.create(form(VALID))))
        .toBe("/admin/experience?status=saved");
      expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    });

    it("redirects to ?status=error when the insert is rejected, and does NOT revalidate", async () => {
      injected.insertError = { message: "new row violates row-level security policy" };
      expect(await destinationOf(() => actions.create(form(VALID))))
        .toBe("/admin/experience?status=error");
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("redirects to ?status=error when the form fails validation", async () => {
      expect(await destinationOf(() => actions.create(form({ company: "" }))))
        .toBe("/admin/experience?status=error");
    });

    it("redirects to ?status=error when the nextSort read fails", async () => {
      injected.selectError = { message: "permission denied" };
      expect(await destinationOf(() => actions.create(form(VALID))))
        .toBe("/admin/experience?status=error");
    });
  });

  describe("update", () => {
    it("redirects to ?status=saved on success", async () => {
      expect(await destinationOf(() => actions.update(form({ ...VALID, id: "a" }))))
        .toBe("/admin/experience?status=saved");
    });

    it("redirects to ?status=error when the update is rejected", async () => {
      injected.updateError = { message: "rejected" };
      expect(await destinationOf(() => actions.update(form({ ...VALID, id: "a" }))))
        .toBe("/admin/experience?status=error");
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("redirects to ?status=error when the update matches zero rows (RLS-filtered, not erroring)", async () => {
      // RLS's USING clause is a row filter for UPDATE, not a raising check: a
      // caller `is_site_owner()` no longer matches gets `error: null` with no
      // rows back, not an error. Without the affected-rows check this used to
      // sail through to ?status=saved.
      injected.updateFiltered = true;
      expect(await destinationOf(() => actions.update(form({ ...VALID, id: "a" }))))
        .toBe("/admin/experience?status=error");
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("redirects to ?status=saved on success", async () => {
      expect(await destinationOf(() => actions.remove(form({ id: "a" }))))
        .toBe("/admin/experience?status=saved");
    });

    it("redirects to ?status=error when the delete is rejected (the I1 bug)", async () => {
      // This is the exact regression: the old hand-written delete ignored
      // `error` and always redirected to ?status=saved.
      injected.deleteError = { message: "rejected by policy" };
      expect(await destinationOf(() => actions.remove(form({ id: "a" }))))
        .toBe("/admin/experience?status=error");
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("redirects to ?status=error when the delete matches zero rows (RLS-filtered, not erroring)", async () => {
      // Same gap as the update case: RLS filters the row out of the DELETE's
      // visibility instead of raising, so PostgREST reports success with no
      // rows deleted.
      injected.deleteFiltered = true;
      expect(await destinationOf(() => actions.remove(form({ id: "a" }))))
        .toBe("/admin/experience?status=error");
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("move", () => {
    it("redirects back to the list on success", async () => {
      expect(await destinationOf(() => actions.move(form({ id: "b", direction: "up" }))))
        .toBe("/admin/experience");
      expect(revalidatePath).toHaveBeenCalled();
    });

    it("redirects to ?status=error when the FIRST of the two writes is rejected", async () => {
      injected.failUpdateNumber = 1;
      expect(await destinationOf(() => actions.move(form({ id: "b", direction: "up" }))))
        .toBe("/admin/experience?status=error");
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("redirects to ?status=error when the SECOND of the two writes is rejected", async () => {
      injected.failUpdateNumber = 2;
      expect(await destinationOf(() => actions.move(form({ id: "b", direction: "up" }))))
        .toBe("/admin/experience?status=error");
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("redirects to ?status=error when the row to move no longer exists", async () => {
      expect(await destinationOf(() => actions.move(form({ id: "gone", direction: "up" }))))
        .toBe("/admin/experience?status=error");
    });

    it("redirects to ?status=error when the FIRST write matches zero rows (RLS-filtered)", async () => {
      injected.filterUpdateNumber = 1;
      expect(await destinationOf(() => actions.move(form({ id: "b", direction: "up" }))))
        .toBe("/admin/experience?status=error");
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("redirects to ?status=error when the SECOND write matches zero rows (RLS-filtered)", async () => {
      injected.filterUpdateNumber = 2;
      expect(await destinationOf(() => actions.move(form({ id: "b", direction: "up" }))))
        .toBe("/admin/experience?status=error");
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("authorization", () => {
    it("sends a non-owner to ?status=error instead of writing", async () => {
      ownerEmail = "attacker@example.com";
      expect(await destinationOf(() => actions.create(form(VALID))))
        .toBe("/admin/experience?status=error");
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("sends a signed-out caller to ?status=error", async () => {
      ownerEmail = null;
      expect(await destinationOf(() => actions.remove(form({ id: "a" }))))
        .toBe("/admin/experience?status=error");
    });
  });

  describe("non-sortable tables", () => {
    it("do not expose move at runtime as a silent no-op", async () => {
      const skills = createCrudActions({
        table: "skills",
        path: "/admin/skills",
        schema: experienceSchema,
        assignSortOnCreate: true,
      });
      // `move` is not on the typed surface for a non-sortable table; if it is
      // reached anyway it must error out, not quietly report success.
      const untyped = skills as unknown as { move: (fd: FormData) => Promise<void> };
      expect(await destinationOf(() => untyped.move(form({ id: "a", direction: "up" }))))
        .toBe("/admin/skills?status=error");
    });
  });
});
