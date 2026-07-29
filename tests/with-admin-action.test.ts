import { describe, it, expect, vi, afterEach } from "vitest";
import { redirect } from "next/navigation";
import { withAdminAction } from "@/lib/admin/action-utils";

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
