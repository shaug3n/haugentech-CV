import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Profile has its own single-row action rather than using `createCrudActions`.
 * Same stubbing approach as tests/posts-actions.test.ts and tests/crud-actions.test.ts.
 */

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

interface Injected {
  updateError?: { message: string };
  /**
   * Simulates an RLS-filtered write: no error, but the row isn't visible to
   * the query (the owner-identity check in `is_site_owner()` no longer
   * matches). PostgREST reports this as `{ data: [], error: null }`.
   */
  updateFiltered?: boolean;
}

let injected: Injected = {};
let lastUpdate: Record<string, unknown> | null = null;

const fakeClient = {
  auth: { getUser: async () => ({ data: { user: { email: "owner@example.com" } } }) },
  from() {
    return {
      update(values: Record<string, unknown>) {
        lastUpdate = values;
        return {
          eq: () => ({
            select: () => {
              if (injected.updateError) return Promise.resolve({ data: null, error: injected.updateError });
              return Promise.resolve({ data: injected.updateFiltered ? [] : [{ id: 1 }], error: null });
            },
          }),
        };
      },
    };
  },
};

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServer: async () => fakeClient }));

const { saveProfile } = await import("@/app/admin/profile/actions");

async function destinationOf(run: () => Promise<void>): Promise<string> {
  try {
    await run();
  } catch (err) {
    const digest = (err as { digest?: string }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
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

describe("saveProfile", () => {
  beforeEach(() => {
    injected = {};
    lastUpdate = null;
    process.env.ADMIN_EMAIL = "owner@example.com";
    revalidatePath.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it("redirects to ?status=saved on success", async () => {
    expect(await destinationOf(() => saveProfile(form({ name: "Sondre" }))))
      .toBe("/admin/profile?status=saved");
    expect(lastUpdate).toMatchObject({ name: "Sondre" });
  });

  it("redirects to ?status=error when the update is rejected", async () => {
    injected.updateError = { message: "rejected by policy" };
    expect(await destinationOf(() => saveProfile(form({ name: "Sondre" }))))
      .toBe("/admin/profile?status=error");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("redirects to ?status=error when the update matches zero rows (RLS-filtered, not erroring)", async () => {
    // RLS's USING clause is a row filter for UPDATE, not a raising check: a
    // caller is_site_owner() no longer matches gets error: null with no rows
    // back, not an error.
    injected.updateFiltered = true;
    expect(await destinationOf(() => saveProfile(form({ name: "Sondre" }))))
      .toBe("/admin/profile?status=error");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
