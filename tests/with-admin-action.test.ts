import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireUser, withAdminAction } from "@/lib/admin/action-utils";

function isNextRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

describe("withAdminAction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lets a successful action's redirect() propagate untouched", async () => {
    const action = withAdminAction("/admin/profile?status=error", async () => {
      redirect("/admin/profile?status=saved");
    });

    let caught: unknown;
    try {
      await action();
    } catch (err) {
      caught = err;
    }

    // The redirect must escape the wrapper as Next's control-flow error,
    // not be swallowed or converted into the error redirect.
    expect(isNextRedirectError(caught)).toBe(true);
    expect((caught as { digest: string }).digest).toContain("/admin/profile?status=saved");
  });

  it("catches a genuine thrown error, logs it, and redirects to the error path instead of letting it escape", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const action = withAdminAction("/admin/profile?status=error", async () => {
      throw new Error("upload failed: bucket unreachable");
    });

    let caught: unknown;
    try {
      await action();
    } catch (err) {
      caught = err;
    }

    // Control lands on the error redirect, not the original error.
    expect(isNextRedirectError(caught)).toBe(true);
    expect((caught as { digest: string }).digest).toContain("/admin/profile?status=error");

    // The real error was logged server-side for diagnosability...
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    const loggedArgs = consoleErrorSpy.mock.calls[0];
    expect(loggedArgs.some((a) => a instanceof Error && a.message === "upload failed: bucket unreachable")).toBe(true);

    // ...but its text must never be the thing that reaches the browser as
    // the thrown/redirected value.
    expect(JSON.stringify(caught)).not.toContain("bucket unreachable");
  });

  it("catches requireUser-style plain throws (stale session) the same way", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const action = withAdminAction("/admin/certifications?status=error", async () => {
      throw new Error("Unauthorized");
    });

    let caught: unknown;
    try {
      await action();
    } catch (err) {
      caught = err;
    }

    expect(isNextRedirectError(caught)).toBe(true);
    expect((caught as { digest: string }).digest).toContain("/admin/certifications?status=error");
  });
});

/** Minimal stand-in for `supabase.auth.getUser()`. */
function fakeAuthClient(user: { email?: string } | null): SupabaseClient {
  return {
    auth: { getUser: async () => ({ data: { user } }) },
  } as unknown as SupabaseClient;
}

describe("requireUser owner check", () => {
  const original = process.env.ADMIN_EMAIL;

  beforeEach(() => {
    process.env.ADMIN_EMAIL = "owner@example.com";
  });

  afterEach(() => {
    if (original === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = original;
  });

  it("accepts the owner", async () => {
    await expect(requireUser(fakeAuthClient({ email: "owner@example.com" }))).resolves.toBeTruthy();
  });

  it("accepts the owner regardless of case and surrounding whitespace", async () => {
    await expect(requireUser(fakeAuthClient({ email: " Owner@Example.com " }))).resolves.toBeTruthy();
  });

  it("rejects an unauthenticated caller", async () => {
    await expect(requireUser(fakeAuthClient(null))).rejects.toThrow(/Unauthorized/);
  });

  it("rejects a different authenticated Supabase user (the C1 hole)", async () => {
    // Anyone could hold a valid session for this project: the anon key is public
    // and signup is on by default. "A user exists" is not authorization.
    await expect(requireUser(fakeAuthClient({ email: "attacker@example.com" }))).rejects.toThrow(/Unauthorized/);
  });

  it("rejects a user with no email claim at all", async () => {
    await expect(requireUser(fakeAuthClient({}))).rejects.toThrow(/Unauthorized/);
  });

  it("fails closed when ADMIN_EMAIL is not configured", async () => {
    delete process.env.ADMIN_EMAIL;
    await expect(requireUser(fakeAuthClient({ email: "owner@example.com" })))
      .rejects.toThrow(/ADMIN_EMAIL is not configured/);
  });
});
