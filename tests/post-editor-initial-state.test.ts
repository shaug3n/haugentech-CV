// @vitest-environment node
import { describe, expect, it } from "vitest";
import { getInitialPostEditorState } from "@/lib/admin/post-editor/markdown";

describe("post editor initial state", () => {
  it("detects rich mode without requiring a DOM", () => {
    expect(getInitialPostEditorState("# Supported Markdown")).toEqual({
      mode: "rich",
      notice: null,
    });
  });

  it("detects Markdown fallback without requiring a DOM", () => {
    expect(getInitialPostEditorState("<div>legacy</div>")).toEqual({
      mode: "markdown",
      notice: "Rich mode may reformat this post",
    });
  });
});
