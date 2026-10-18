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

  async function renderToolbar(
    content: string,
    props: Partial<{ mode: "rich" | "markdown"; hasPendingUploads: boolean; onModeChange(mode: "rich" | "markdown"): void }> = {},
  ) {
    vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
    vi.stubGlobal("React", React);
    const editor = new Editor({
      element: document.createElement("div"),
      extensions: createPostEditorExtensions(),
      content,
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
          ...props,
        }),
      );
    });
    return {
      editor,
      container,
      cleanup: async () => {
        await act(async () => root.unmount());
        editor.destroy();
      },
    };
  }

  it("reflects and sets the block style through the select", async () => {
    const { editor, container, cleanup } = await renderToolbar("<h2>Title</h2><p>Body</p>");
    const select = container.querySelector<HTMLSelectElement>('select[aria-label="Block style"]');
    await act(async () => {
      editor.commands.setTextSelection(2);
    });
    expect(select?.value).toBe("h2");

    await act(async () => {
      editor.commands.setTextSelection(10);
    });
    expect(select?.value).toBe("paragraph");

    await act(async () => {
      select!.value = "h3";
      select!.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(editor.getJSON().content?.[1]).toMatchObject({ type: "heading", attrs: { level: 3 } });
    expect(select?.value).toBe("h3");
    await cleanup();
  });

  it("disables undo and redo until history allows them", async () => {
    const { editor, container, cleanup } = await renderToolbar("word");
    const undo = container.querySelector<HTMLButtonElement>('[aria-label="Undo"]');
    const redo = container.querySelector<HTMLButtonElement>('[aria-label="Redo"]');
    expect(undo?.disabled).toBe(true);
    expect(redo?.disabled).toBe(true);

    await act(async () => {
      editor.commands.insertContent("!");
    });
    expect(undo?.disabled).toBe(false);

    await act(async () => {
      undo?.click();
    });
    expect(redo?.disabled).toBe(false);
    await cleanup();
  });

  it("renders a mode switch that blocks Markdown while uploads are pending", async () => {
    const onModeChange = vi.fn();
    const { container, cleanup } = await renderToolbar("word", {
      hasPendingUploads: true,
      onModeChange,
    });
    const group = container.querySelector('[role="group"][aria-label="Editor mode"]');
    const [rich, markdown] = Array.from(group?.querySelectorAll("button") ?? []);
    expect(rich.getAttribute("aria-pressed")).toBe("true");
    expect(markdown.disabled).toBe(true);
    expect(markdown.title).toBe("Wait for image uploads to finish");
    await act(async () => markdown.click());
    expect(onModeChange).not.toHaveBeenCalled();
    await cleanup();
  });

  it("shows only the mode switch in Markdown mode", async () => {
    const onModeChange = vi.fn();
    const { container, cleanup } = await renderToolbar("word", { mode: "markdown", onModeChange });
    expect(container.querySelector('[aria-label="Bold"]')).toBeNull();
    const rich = container.querySelector<HTMLButtonElement>('[aria-label="Editor mode"] button');
    await act(async () => rich?.click());
    expect(onModeChange).toHaveBeenCalledWith("rich");
    await cleanup();
  });
});
