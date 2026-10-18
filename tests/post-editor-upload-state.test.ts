import { describe, expect, it } from "vitest";
import { reduceUploadState } from "@/lib/admin/post-editor/upload-state";

describe("post editor upload state", () => {
  it("keeps the second upload pending when the first settles", () => {
    const both = reduceUploadState(
      reduceUploadState([], { type: "start", id: "first" }),
      { type: "start", id: "second" },
    );
    expect(reduceUploadState(both, { type: "finish", id: "first" })).toEqual([
      "second",
    ]);
  });
});
