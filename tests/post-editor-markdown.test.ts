// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  getInitialPostEditorState,
  parsePostMarkdown,
  serializePostMarkdown,
} from "@/lib/admin/post-editor/markdown";

describe("post editor Markdown codec", () => {
  it("accepts empty Markdown as an untouched rich document", () => {
    expect(parsePostMarkdown("")).toMatchObject({ type: "doc" });
    expect(getInitialPostEditorState("")).toEqual({ mode: "rich", notice: null });
  });

  it("round-trips supported Markdown blocks and marks", () => {
    const markdown =
      "# Heading\n\n**bold** *italic* ~~strike~~ `code`\n\n- item\n\n[link](https://example.com)\n\n```ts\nconst n = 1;\n```\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n![alt](https://example.com/image.webp)";
    const output = serializePostMarkdown(parsePostMarkdown(markdown));
    for (const part of [
      "# Heading",
      "**bold**",
      "*italic*",
      "~~strike~~",
      "`code`",
      "- item",
      "[link](https://example.com)",
      "```ts",
      "| a | b |",
      "![alt](https://example.com/image.webp)",
    ]) {
      expect(output).toContain(part);
    }
  });

  it("opens content in Markdown mode when raw HTML cannot round-trip", () => {
    expect(getInitialPostEditorState("<div>legacy</div>")).toEqual({
      mode: "markdown",
      notice: "Rich mode may reformat this post",
    });
  });

  it("normalizes line endings and terminal blank lines for the fidelity check", () => {
    expect(getInitialPostEditorState("# Heading\r\n\r\n").mode).toBe("rich");
  });

  it("preserves Markdown-special characters in image alt text", () => {
    const markdown = String.raw`![left \] and \\ right](https://example.com/image.webp)`;
    const serialized = serializePostMarkdown(parsePostMarkdown(markdown));
    const reparsed = parsePostMarkdown(serialized);
    expect(reparsed.content?.[0]).toMatchObject({
      type: "image",
      attrs: { alt: "left ] and \\ right" },
    });
  });
});
