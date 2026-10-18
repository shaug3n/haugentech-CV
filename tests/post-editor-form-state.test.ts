import { describe, expect, it } from "vitest";
import {
  hasPendingUploads,
  initialPostFormState,
  reducePostFormState,
} from "@/lib/admin/post-editor/form-state";

describe("post editor form state", () => {
  it("keeps Save disabled until both language uploads finish", () => {
    const enPending = reducePostFormState(initialPostFormState, {
      type: "pending",
      field: "body_md_en",
      count: 1,
    });
    const bothPending = reducePostFormState(enPending, {
      type: "pending",
      field: "body_md_no",
      count: 1,
    });
    const noPending = reducePostFormState(bothPending, {
      type: "pending",
      field: "body_md_en",
      count: 0,
    });

    expect(hasPendingUploads(noPending)).toBe(true);
    expect(
      hasPendingUploads(
        reducePostFormState(noPending, {
          type: "pending",
          field: "body_md_no",
          count: 0,
        }),
      ),
    ).toBe(false);
  });

  it("tracks unsaved edits and clears dirty state on submit", () => {
    const dirty = reducePostFormState(initialPostFormState, { type: "change" });

    expect(dirty.dirty).toBe(true);
    expect(reducePostFormState(dirty, { type: "submitted" }).dirty).toBe(false);
  });
});
