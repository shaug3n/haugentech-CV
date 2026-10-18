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

  it("keeps an ordinary post with all supported blocks in rich mode", () => {
    const markdown =
      "# Heading\n\n**bold** *italic*\n\n[link](https://example.com)\n\n- list item\n  1. nested ordered\n     - nested bullet\n\n![image](https://example.com/image.webp)\n\n| a |\n| --- |\n| b |\n\n```text\ncode\n```\n\n> quote";

    expect(getInitialPostEditorState(markdown).mode).toBe("rich");
  });

  it.each([
    [
      "unordered",
      "- ```text\n  ![x](y)\n  ```",
      "bulletList",
    ],
    [
      "ordered",
      "1. item\n\n   ```text\n   ![x](y)\n   ```",
      "orderedList",
    ],
    [
      "nested",
      "- outer\n  - ```text\n    ![x](y)\n    ```",
      "bulletList",
    ],
  ])(
    "round-trips literal fenced code and list structure in %s lists",
    async (_description, markdown, listType) => {
      const original = parsePostMarkdown(markdown);
      const serialized = serializePostMarkdown(original);
      const reparsed = parsePostMarkdown(serialized);
      const collectStructure = (node: typeof original): unknown =>
        node.type === "bulletList" || node.type === "orderedList"
          ? {
              type: node.type,
              content: node.content?.map(collectStructure),
            }
          : node.type === "listItem"
            ? {
                type: node.type,
                content: node.content?.map(collectStructure),
              }
            : node.type === "codeBlock"
              ? {
                  type: node.type,
                  attrs: node.attrs,
                  text: (node.content ?? [])
                    .map((child) => child.text ?? "")
                    .join(""),
                }
              : {
                  type: node.type,
                  content: node.content?.map(collectStructure),
                };
      const codeBlocks = (document: typeof original) => {
        const blocks: Array<{ language: unknown; text: string }> = [];
        const visit = (node: typeof original) => {
          if (node.type === "codeBlock") {
            blocks.push({
              language: node.attrs?.language,
              text: (node.content ?? []).map((child) => child.text ?? "").join(""),
            });
          }
          node.content?.forEach(visit);
        };
        visit(document);
        return blocks;
      };
      const html = await renderMarkdown(serialized);
      const rendered = new DOMParser().parseFromString(html, "text/html");

      expect(original.content?.some((node) => node.type === listType)).toBe(true);
      expect(collectStructure(reparsed)).toEqual(collectStructure(original));
      expect(codeBlocks(reparsed)).toEqual(codeBlocks(original));
      expect(rendered.querySelectorAll("li pre code")).toHaveLength(1);
      expect(rendered.querySelector("li pre code")?.textContent).toContain(
        "![x](y)",
      );
      expect(rendered.querySelector("img")).toBeNull();
    },
  );

  it.each([
    [
      "preserves meaningful code indentation",
      "- ```python\n    indented()\n  next()\n  ```",
      [{ language: "python", text: "  indented()\nnext()" }],
    ],
    [
      "preserves nested unordered and ordered list fences",
      "- outer\n  1. inner\n     ```js\n       first()\n     next()\n     ```",
      undefined,
    ],
    [
      "preserves blockquote-contained list code literally",
      "> - ```text\n>   ![x](y)\n>   ```",
      undefined,
    ],
    [
      "preserves fence-like lines inside nested code",
      "- ````text\n  - ```text\n  ~~~\n  ![x](y)\n  ````",
      undefined,
    ],
  ])("%s", async (_description, markdown, expectedCodeBlocks) => {
    const original = parsePostMarkdown(markdown);
    const serialized = serializePostMarkdown(original);
    const reparsed = parsePostMarkdown(serialized);
    const collectCodeBlocks = (document: typeof original) => {
      const blocks: Array<{ language: unknown; text: string }> = [];
      const visit = (node: typeof original) => {
        if (node.type === "codeBlock") {
          blocks.push({
            language: node.attrs?.language,
            text: (node.content ?? []).map((child) => child.text ?? "").join(""),
          });
        }
        node.content?.forEach(visit);
      };
      visit(document);
      return blocks;
    };
    const codeBlocks = collectCodeBlocks(original);
    const rendered = new DOMParser().parseFromString(
      await renderMarkdown(serialized),
      "text/html",
    );
    if (expectedCodeBlocks) {
      expect(codeBlocks).toEqual(expectedCodeBlocks);
    }
    expect(collectCodeBlocks(reparsed)).toEqual(codeBlocks);
    expect(rendered.querySelectorAll("pre code")).toHaveLength(1);
    if (markdown.includes("![x](y)")) {
      expect(rendered.querySelector("pre code")?.textContent).toContain(
        "![x](y)",
      );
    }
    expect(rendered.querySelector("img")).toBeNull();
  });

  it("leaves top-level fenced code text and language unchanged", () => {
    const markdown = "```ts\n  indented()\n```";
    const original = parsePostMarkdown(markdown);
    const serialized = serializePostMarkdown(original);
    const reparsed = parsePostMarkdown(serialized);
    const codeBlock = (document: typeof original) => {
      let found: { language: unknown; text: string } | null = null;
      const visit = (node: typeof original) => {
        if (node.type === "codeBlock") {
          found = {
            language: node.attrs?.language,
            text: (node.content ?? []).map((child) => child.text ?? "").join(""),
          };
        }
        node.content?.forEach(visit);
      };
      visit(document);
      return found;
    };

    expect(serialized).toContain("```ts\n  indented()\n```");
    expect(codeBlock(reparsed)).toEqual(codeBlock(original));
  });

  it("prefixes every blockquote continuation line, including blank code lines", () => {
    const markdown =
      "> - ```text\n>   first\n>\n>   second\n>   ```";
    const serialized = serializePostMarkdown(parsePostMarkdown(markdown));

    expect(serialized).toBe("> - ```text\n>   first\n>   \n>   second\n>   ```");
  });

  it("does not indent list-like fenced code inside an outer code block", () => {
    const markdown = "````text\n- ```text\n![x](y)\n```\n````";
    const original = parsePostMarkdown(markdown);
    const serialized = serializePostMarkdown(original);

    expect(serialized).toContain("- ```text\n![x](y)");
    expect(serialized).not.toContain("- ```text\n  ![x](y)");
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

  it("keeps hard breaks and paragraph boundaries inside one rendered table cell", async () => {
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
                        { type: "text", text: "one" },
                        { type: "hardBreak" },
                        { type: "text", text: "two" },
                      ],
                    },
                    {
                      type: "paragraph",
                      content: [{ type: "text", text: "three" }],
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
    const reparsedCell = reparsed.content?.[0]?.content?.[1]?.content?.[0];
    const cellText = (reparsedCell?.content ?? [])
      .flatMap((paragraph) => paragraph.content ?? [])
      .map((node) => node.text ?? "")
      .join("");
    const rendered = new DOMParser().parseFromString(
      await renderMarkdown(serialized),
      "text/html",
    );
    const cell = rendered.querySelector("table tbody tr td");

    expect(serialized.split("\n")).toHaveLength(3);
    expect(cellText).toBe("onetwothree");
    expect(reparsedCell?.content).toHaveLength(1);
    expect(rendered.querySelectorAll("table tbody tr td")).toHaveLength(1);
    expect(cell?.textContent).toBe("onetwothree");
    expect(cell?.querySelectorAll("br")).toHaveLength(2);
  });

  it("emits an empty header for tables whose first row has no header cells", () => {
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
                  type: "tableCell",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "first" }] }],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [{ type: "paragraph", content: [{ type: "text", text: "second" }] }],
                },
              ],
            },
          ],
        },
      ],
    };
    const serialized = serializePostMarkdown(document);
    const reparsed = parsePostMarkdown(serialized);
    const table = reparsed.content?.[0];

    expect(table?.content?.[0]?.content?.[0]?.type).toBe("tableHeader");
    expect(table?.content?.[0]?.content?.[0]?.content?.[0]?.text).toBeUndefined();
    expect(
      table?.content?.[1]?.content?.[0]?.content
        ?.flatMap((paragraph) => paragraph.content ?? [])
        .map((node) => node.text ?? "")
        .join(""),
    ).toBe("first");
    expect(
      table?.content?.[2]?.content?.[0]?.content
        ?.flatMap((paragraph) => paragraph.content ?? [])
        .map((node) => node.text ?? "")
        .join(""),
    ).toBe("second");
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
    expect(serialized).toContain("  | a    | b  |\n  ![x](y)");
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
