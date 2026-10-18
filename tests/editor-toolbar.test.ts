// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import React, { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EditorToolbar } from "@/components/admin/post-editor/EditorToolbar";
import { createPostEditorExtensions } from "@/lib/admin/post-editor/markdown";

describe("EditorToolbar active state", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("updates aria-pressed after a transaction changes the active mark", async () => {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("React", React);
    const editor = new Editor({
      element: document.createElement("div"),
      extensions: createPostEditorExtensions(),
      content: "word",
    });
    const container = document.createElement("div");
    const root = createRoot(container);

    await act(async () => {
      root.render(
        createElement(EditorToolbar, {
          editor,
          mode: "rich",
          onModeChange: () => {},
          onInsertImage: () => {},
          hasPendingUploads: false,
        }),
      );
    });
    const bold = container.querySelector('[aria-label="Bold"]');
    expect(bold?.getAttribute("aria-pressed")).toBe("false");

    await act(async () => {
      editor.commands.setTextSelection({ from: 1, to: 5 });
      editor.commands.toggleBold();
    });

    expect(bold?.getAttribute("aria-pressed")).toBe("true");
    await act(async () => root.unmount());
    editor.destroy();
  });
});
