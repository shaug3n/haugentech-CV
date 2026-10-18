import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Posts has its own actions (publish guard, per-post redirect target,
 * `published_at` stamping, duplicate-slug reporting) rather than using
 * `createCrudActions`. Same stubbing approach as tests/crud-actions.test.ts.
 */

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));

interface Injected {
  insertError?: { code?: string; message: string };
  updateError?: { code?: string; message: string };
  deleteError?: { message: string };
  readError?: { message: string };
  /** Value of `published_at` on the existing row, for the stamping check. */
  existingPublishedAt?: string | null;
  /**
   * Simulates an RLS-filtered write: no error, but the row isn't visible to
   * the query (the owner-identity check in `is_site_owner()` no longer
   * matches). PostgREST reports this as `{ data: [], error: null }`.
   */
  updateFiltered?: boolean;
  deleteFiltered?: boolean;
}

let injected: Injected = {};
let lastUpdate: Record<string, unknown> | null = null;
let lastInsert: Record<string, unknown> | null = null;

const fakeClient = {
  auth: { getUser: async () => ({ data: { user: { email: "owner@example.com" } } }) },
  from() {
    return {
      insert(values: Record<string, unknown>) {
        lastInsert = values;
        return {
          select: () => ({
            single: () => Promise.resolve(
              injected.insertError
                ? { data: null, error: injected.insertError }
                : { data: { id: "post-1" }, error: null },
            ),
          }),
        };
      },
      select() {
        return {
          eq: () => ({
            single: () => Promise.resolve(
              injected.readError
                ? { data: null, error: injected.readError }
                : { data: { published_at: injected.existingPublishedAt ?? null }, error: null },
            ),
          }),
        };
      },
      update(values: Record<string, unknown>) {
        lastUpdate = values;
        return {
          eq: () => ({
            select: () => {
              if (injected.updateError) return Promise.resolve({ data: null, error: injected.updateError });
              return Promise.resolve({ data: injected.updateFiltered ? [] : [{ id: "post-1" }], error: null });
            },
          }),
        };
      },
      delete() {
        return {
          eq: () => ({
            select: () => {
              if (injected.deleteError) return Promise.resolve({ data: null, error: injected.deleteError });
              return Promise.resolve({ data: injected.deleteFiltered ? [] : [{ id: "post-1" }], error: null });
            },
          }),
        };
      },
    };
  },
};

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServer: async () => fakeClient }));

const { createPost, updatePost, deletePost } = await import("@/app/admin/posts/actions");

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

const UNIQUE_VIOLATION = { code: "23505", message: 'duplicate key value violates unique constraint "posts_slug_key"' };

describe("post actions", () => {
  beforeEach(() => {
    injected = {};
    lastUpdate = null;
    lastInsert = null;
    process.env.ADMIN_EMAIL = "owner@example.com";
    revalidatePath.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => { vi.restoreAllMocks(); });

  describe("createPost", () => {
    it("redirects to the new post's editor on success", async () => {
      expect(await destinationOf(() => createPost(form({ slug: "My New Post" }))))
        .toBe("/admin/posts/post-1");
      expect(lastInsert).toMatchObject({ slug: "my-new-post", published: false });
    });

    it("reports a duplicate slug specifically, not the generic error", async () => {
      injected.insertError = UNIQUE_VIOLATION;
      expect(await destinationOf(() => createPost(form({ slug: "taken" }))))
        .toBe("/admin/posts?status=slug-taken");
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("falls back to the generic error for any other database failure", async () => {
      injected.insertError = { code: "42501", message: "new row violates row-level security policy" };
      expect(await destinationOf(() => createPost(form({ slug: "x" }))))
        .toBe("/admin/posts?status=error");
    });
  });

  describe("updatePost", () => {
    const complete = { id: "post-1", slug: "s", title_en: "Hi", body_md_en: "Body" };

    it("redirects to the post's editor with ?status=saved on success", async () => {
      expect(await destinationOf(() => updatePost(form(complete))))
        .toBe("/admin/posts/post-1?status=saved");
    });

    it("persists rich-editor Markdown unchanged", async () => {
      const markdown =
        "![A photo](https://project.supabase.co/storage/v1/object/public/media/posts/inline/photo.webp)\n\n**Bold**";
      await destinationOf(() =>
        updatePost(form({ ...complete, body_md_en: markdown })),
      );
      expect(lastUpdate?.body_md_en).toBe(markdown);
    });

    it("reports a duplicate slug specifically", async () => {
      injected.updateError = UNIQUE_VIOLATION;
      expect(await destinationOf(() => updatePost(form(complete))))
        .toBe("/admin/posts/post-1?status=slug-taken");
    });

    it("refuses to publish a post with no complete language (the I3 guard)", async () => {
      expect(await destinationOf(() => updatePost(form({ id: "post-1", slug: "s", published: "on" }))))
        .toBe("/admin/posts/post-1?status=error");
      expect(lastUpdate).toBeNull();
    });

    it("stamps published_at on first publish", async () => {
      injected.existingPublishedAt = null;
      await destinationOf(() => updatePost(form({ ...complete, published: "on" })));
      expect(typeof lastUpdate?.published_at).toBe("string");
    });

    it("does not re-stamp published_at on a later save", async () => {
      injected.existingPublishedAt = "2026-01-01T00:00:00.000Z";
      await destinationOf(() => updatePost(form({ ...complete, published: "on" })));
      expect(lastUpdate).not.toHaveProperty("published_at");
    });

    it("reports an error when the published_at lookup itself fails", async () => {
      injected.readError = { message: "permission denied" };
      expect(await destinationOf(() => updatePost(form({ ...complete, published: "on" }))))
        .toBe("/admin/posts/post-1?status=error");
    });

    it("redirects to ?status=error when the update matches zero rows (RLS-filtered, not erroring)", async () => {
      // RLS's USING clause is a row filter for UPDATE, not a raising check: a
      // caller `is_site_owner()` no longer matches gets `error: null` with no
      // rows back, not an error.
      injected.updateFiltered = true;
      expect(await destinationOf(() => updatePost(form(complete))))
        .toBe("/admin/posts/post-1?status=error");
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });

  describe("deletePost", () => {
    it("redirects to ?status=saved on success", async () => {
      expect(await destinationOf(() => deletePost(form({ id: "post-1" }))))
        .toBe("/admin/posts?status=saved");
    });

    it("redirects to ?status=error when the delete is rejected (the I1 bug)", async () => {
      injected.deleteError = { message: "rejected by policy" };
      expect(await destinationOf(() => deletePost(form({ id: "post-1" }))))
        .toBe("/admin/posts?status=error");
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    it("redirects to ?status=error when the delete matches zero rows (RLS-filtered, not erroring)", async () => {
      injected.deleteFiltered = true;
      expect(await destinationOf(() => deletePost(form({ id: "post-1" }))))
        .toBe("/admin/posts?status=error");
      expect(revalidatePath).not.toHaveBeenCalled();
    });
  });
});
