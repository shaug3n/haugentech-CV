// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import {
  createPostEditorExtensions,
  getPostEditorMarkdown,
  getInitialPostEditorState,
  parsePostMarkdown,
  serializePostMarkdown,
} from "@/lib/admin/post-editor/markdown";
import { renderMarkdown } from "@/lib/markdown";

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

  it.each([
    ["a single table", "| a | b |\n| --- | --- |\n| 1 | 2 |"],
    [
      "multiple tables",
      "Before.\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\nAfter.\n\n| c | d |\n| --- | --- |\n| 3 | 4 |",
    ],
    [
      "a padded hand-aligned table",
      "| a    | b   |\n| ---- | --- |\n| 1    | 2   |",
    ],
    ["a table at the start of the document", "| a | b |\n| --- | --- |\n| 1 | 2 |\n\nAfter."],
  ])("opens %s in rich mode", (_description, markdown) => {
    expect(getInitialPostEditorState(markdown).mode).toBe("rich");
  });

  it("preserves and compares table alignment", () => {
    const markdown = "| left | center | right |\n| :--- | :---: | ---: |\n| a | b | c |";

    expect(serializePostMarkdown(parsePostMarkdown(markdown))).toMatch(
      /\| :-+ \| :-+: \| -+: \|/,
    );
    expect(getInitialPostEditorState(markdown).mode).toBe("rich");
  });

  it("escapes every table-cell pipe without changing cell text", async () => {
    const document = {
      type: "doc",
      content: [
        {
          type: "table",
          content: [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "value" }] }],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [
                    {
                      type: "paragraph",
                      content: [
                        { type: "text", text: "a || b and " },
                        { type: "text", text: "x|y", marks: [{ type: "code" }] },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const serialized = serializePostMarkdown(document);
    const reparsed = parsePostMarkdown(serialized);
    const table = reparsed.content?.find((node) => node.type === "table");
    const bodyCell = table?.content?.[1]?.content?.[0];
    const cellText = (bodyCell?.content ?? [])
      .flatMap((paragraph) => paragraph.content ?? [])
      .map((node) => node.text ?? "")
      .join("");
    const html = await renderMarkdown(serialized);
    const rendered = new DOMParser().parseFromString(html, "text/html");

    expect(cellText).toBe("a || b and x|y");
    expect(rendered.querySelectorAll("table tbody tr td")).toHaveLength(1);
    expect(rendered.querySelector("table tbody tr td")?.textContent).toBe(
      "a || b and x|y",
    );
  });

  it("preserves blank lines inside fenced code while serializing and comparing", () => {
    const markdown = "```text\nfirst\n\n\nlast\n```";
    const serialized = serializePostMarkdown(parsePostMarkdown(markdown));

    expect(serialized).toContain("```text\nfirst\n\n\nlast\n```");
    expect(getInitialPostEditorState(markdown).mode).toBe("rich");
  });

  it("does not normalize inline or nested code while normalizing blocks", () => {
    const source = [
      "Inline `| a    | b  |` and `![x](y)` stay literal.",
      "",
      "> ```text",
      "> | a    | b  |",
      "> ![x](y)",
      ">",
      ">",
      ">",
      "> ```",
      "",
      "- ```text",
      "  | a    | b  |",
      "  ![x](y)",
      "",
      "",
      "",
      "  ```",
      "",
      "| a | b |",
      "| --- | --- |",
      "| 1 | 2 |",
    ].join("\n");

    const serialized = serializePostMarkdown(parsePostMarkdown(source));

    expect(serialized).toContain("`| a    | b  |`");
    expect(serialized).toContain("`![x](y)`");
    expect(serialized).toContain("> | a    | b  |");
    expect(serialized).toContain("> ![x](y)");
    expect(serialized).toContain("| a    | b  |\n![x](y)");
    expect(serialized).toMatch(/\n(?:> ?\n){3}> ```/);
  });

  it("serializes tables without padding and keeps separators between paragraphs", () => {
    const source =
      "# Hello world\n\nSome **bold** text.\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\nAfter table.\n";

    const serialized = serializePostMarkdown(parsePostMarkdown(source));

    expect(serialized).toContain("| a | b |\n| --- | --- |\n| 1 | 2 |");
    expect(serialized).not.toContain("\n\n\n");
  });

  it("removes serializer-only blank lines around tables", () => {
    const markdown =
      "# Hello world\n\nSome **bold** text.\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\nAfter table.\n\n| Name | Longer header |\n| --- | --- |\n| x | y |\n";
    const serialized = serializePostMarkdown(parsePostMarkdown(markdown));

    expect(serialized.startsWith("\n")).toBe(false);
    expect(serialized).not.toContain("\n\n\n");
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

  it.each(["path\\", "a\\]b", "a\\\\b", "[x]", "a]b", "a[b"])(
    "round-trips an image alt without changing its literal characters: %s",
    (alt) => {
      const document = {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: { src: "https://example.com/image.webp", alt },
          },
        ],
      };

      const serialized = serializePostMarkdown(document);
      const reparsed = parsePostMarkdown(serialized);

      expect(reparsed.content?.[0]).toMatchObject({
        type: "image",
        attrs: { alt },
      });
    },
  );

  it("normalizes editor Markdown and preserves image alt text", () => {
    const editor = new Editor({
      element: document.createElement("div"),
      extensions: createPostEditorExtensions(),
      content: {
        type: "doc",
        content: [
          {
            type: "image",
            attrs: {
              src: "https://example.com/image.webp",
              alt: "Fjord [view] here a]b [x]",
            },
          },
          {
            type: "table",
            content: [
              {
                type: "tableRow",
                content: [
                  {
                    type: "tableHeader",
                    content: [{ type: "paragraph", content: [{ type: "text", text: "Name" }] }],
                  },
                  {
                    type: "tableHeader",
                    content: [{ type: "paragraph", content: [{ type: "text", text: "Place" }] }],
                  },
                ],
              },
              {
                type: "tableRow",
                content: [
                  {
                    type: "tableCell",
                    content: [{ type: "paragraph", content: [{ type: "text", text: "Fjord" }] }],
                  },
                  {
                    type: "tableCell",
                    content: [{ type: "paragraph", content: [{ type: "text", text: "North" }] }],
                  },
                ],
              },
            ],
          },
        ],
      },
    });
    try {
      const output = getPostEditorMarkdown(editor);

      expect(output).toContain(String.raw`a\]b`);
      expect(output).toContain("| Name | Place |");
      expect(output).not.toMatch(/\| [^|\n]* {2,}\|/);
      expect(output).not.toContain("\n\n\n");
      const parsed = parsePostMarkdown(output);
      const image = parsed.content
        ?.flatMap((node) => [node, ...(node.content ?? [])])
        .find((node) => node.type === "image");
      expect(image).toMatchObject({
        type: "image",
        attrs: { alt: "Fjord [view] here a]b [x]" },
      });
    } finally {
      editor.destroy();
    }
  });
});
