import { Editor, type Extensions, type JSONContent } from "@tiptap/core";
import { Blockquote } from "@tiptap/extension-blockquote";
import { Image } from "@tiptap/extension-image";
import { getListMarker, ListItem } from "@tiptap/extension-list";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Markdown, MarkdownManager } from "@tiptap/markdown";
import { Placeholder } from "@tiptap/extensions";
import { StarterKit } from "@tiptap/starter-kit";

export function createPostEditorExtensions(): Extensions {
  return [
    StarterKit.configure({
      link: { openOnClick: false },
      blockquote: false,
      listItem: false,
    }),
    ListItem.extend({
      renderMarkdown(node, helpers, context) {
        const ordered = context.parentType === "orderedList";
        const prefix =
          ordered
            ? getListMarker(
                context.meta?.parentAttrs?.type,
                (context.meta?.parentAttrs?.start ?? 1) - 1 +
                  (context.index ?? 0),
                ". ",
              )
            : "- ";
        const [first, ...children] = node.content ?? [];
        // Marked consumes the ordered marker's delimiter column while parsing
        // continuation blocks, so their source indentation is one column narrower.
        const contentOffset = prefix.length - (ordered ? 1 : 0);
        const indent = " ".repeat(contentOffset);
        const listIndent = " ".repeat(prefix.length);
        const indentBlock = (content: string) =>
          content
            .split("\n")
            .map((line) => `${indent}${line}`)
            .join("\n");
        const firstRendered = first ? helpers.renderChildren([first]) : "";
        let output = prefix;
        if (first?.type === "paragraph") {
          output += firstRendered;
        } else if (first?.type === "codeBlock") {
          const [opening, ...lines] = firstRendered.split("\n");
          output += `${opening}\n${lines.map((line) => `${indent}${line}`).join("\n")}`;
        } else if (first) {
          output += `\n${indentBlock(firstRendered)}`;
        }

        children.forEach((child, index) => {
          const rendered =
            helpers.renderChild?.(child, index + 1) ??
            helpers.renderChildren([child]);
          const lines = rendered.split("\n");
          const indented =
            child.type === "codeBlock"
              ? lines
                  .map((line, lineIndex) => {
                    const isFence = lineIndex === 0 || lineIndex === lines.length - 1;
                    return `${" ".repeat(isFence ? prefix.length : contentOffset)}${line}`;
                  })
                  .join("\n")
              : child.type === "bulletList" || child.type === "orderedList"
                ? rendered
                    .split("\n")
                    .map((line) => `${listIndent}${line}`)
                    .join("\n")
              : indentBlock(rendered);
          output += child.type === "paragraph" ? `\n\n${indented}` : `\n${indented}`;
        });

        return output;
      },
    }),
    Blockquote.extend({
      renderMarkdown(node, helpers) {
        if (!node.content) return "";
        return node.content
          .map((child, index) => {
            const rendered =
              helpers.renderChild?.(child, index) ??
              helpers.renderChildren([child]);
            return rendered
              .split("\n")
              .map((line) => `> ${line}`)
              .join("\n");
          })
          .join("\n> \n");
      },
    }),
    Image.extend({
      parseMarkdown(token, helpers) {
        const alt = (token.text ?? "").replace(/\\([\\[\]])/g, "$1");
        return helpers.createNode("image", {
          src: token.href,
          title: token.title,
          alt,
        });
      },
      renderMarkdown(node) {
        const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
        const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
        const title = typeof node.attrs?.title === "string" ? ` "${node.attrs.title}"` : "";
        const escapedAlt = alt.replace(/\\/g, "\\\\").replace(/([\[\]])/g, "\\$1");
        return `![${escapedAlt}](${src}${title})`;
      },
    }).configure({ inline: false, allowBase64: false }),
    Placeholder.configure({ placeholder: "Write something…" }),
    Table.extend({
      renderMarkdown(node, helpers) {
        const rows = node.content ?? [];
        const columns = Math.max(
          0,
          ...rows.map((row) => row.content?.length ?? 0),
        );
        if (!columns) return "";

        const cells = rows.map((row) =>
          Array.from({ length: columns }, (_, index) => {
            const cell = row.content?.[index];
            const text = cell
              ? (cell.content ?? [])
                  .map((block) =>
                    helpers.renderChildren(block.content ?? [block]).trim(),
                  )
                  .join("<br>")
              : "";
            return text
              .replace(/[ \t]*\n[ \t]*/g, "<br>")
              .replace(/\|/g, (pipe, offset: number, source: string) => {
                let backslashes = 0;
                for (
                  let index = offset - 1;
                  index >= 0 && source[index] === "\\";
                  index--
                ) {
                  backslashes++;
                }
                return backslashes % 2 === 0 ? "\\|" : pipe;
              });
          }),
        );
        const header = rows[0]?.content?.some(
          (cell) => cell.type === "tableHeader",
        );
        const alignments = Array.from({ length: columns }, (_, index) => {
          const alignment = rows[0]?.content?.[index]?.attrs?.textAlign ??
            rows[0]?.content?.[index]?.attrs?.align;
          if (alignment === "left") return ":---";
          if (alignment === "right") return "---:";
          if (alignment === "center") return ":---:";
          return "---";
        });
        const outputRows = [
          header ? cells[0] : Array(columns).fill(""),
          alignments,
          ...cells.slice(header ? 1 : 0),
        ];
        return outputRows.map((row) => `| ${row.join(" | ")} |`).join("\n");
      },
    }),
    TableRow,
    TableHeader,
    TableCell,
    Markdown,
  ];
}

function createMarkdownEditor(content: string | JSONContent): Editor {
  return new Editor({
    element: document.createElement("div"),
    extensions: createPostEditorExtensions(),
    content,
    contentType: typeof content === "string" ? "markdown" : "json",
  });
}

export function parsePostMarkdown(markdown: string): JSONContent {
  const editor = createMarkdownEditor(markdown);
  try {
    return editor.getJSON();
  } finally {
    editor.destroy();
  }
}

export function serializePostMarkdown(document: JSONContent): string {
  const editor = createMarkdownEditor(document);
  try {
    return serializeEditorMarkdown(editor);
  } finally {
    editor.destroy();
  }
}

export function getPostEditorMarkdown(editor: Editor): string {
  return serializeEditorMarkdown(editor);
}

function serializeEditorMarkdown(editor: Editor): string {
  return editor.getMarkdown();
}

function normalizeMarkdownForComparison(markdown: string): string {
  return mapMarkdownOutsideCodeFences(
    markdown,
    (outside, isStart, isEnd) => {
      let normalized = outside
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .map((line) => {
          if (!/^[ \t]*\|/.test(line)) return line;
          const cells = line
            .trim()
            .slice(1)
            .replace(/\|$/, "")
            .split("|")
            .map((cell) => {
              const trimmed = cell.trim();
              const separator = trimmed.match(/^(:?)-+(:?)$/);
              return separator
                ? `${separator[1]}---${separator[2]}`
                : trimmed;
            });
          return `| ${cells.join(" | ")} |`;
        })
        .join("\n")
        .replace(/\n(?:[ \t]*\n){2,}/g, "\n\n");

      if (isStart) {
        normalized = normalized.replace(/^(?:[ \t]*\n)+/, "");
      }
      if (isEnd) {
        normalized = normalized.replace(/\n[ \t]*(?:\n[ \t]*)*$/, "");
      }
      return normalized;
    },
  );
}

function mapMarkdownOutsideCodeFences(
  markdown: string,
  transform: (text: string, isStart: boolean, isEnd: boolean) => string,
): string {
  const lines = markdown.match(/[^\n]*\n|[^\n]+$/g) ?? [];
  let result = "";
  let outside = "";
  let hasFence = false;
  let fence: { character: string; length: number } | null = null;

  for (const line of lines) {
    const lineContent = line.endsWith("\n") ? line.slice(0, -1) : line;
    const content = lineContent.endsWith("\r")
      ? lineContent.slice(0, -1)
      : lineContent;
    const opening = content.match(/^ {0,3}(`{3,}|~{3,})/);

    if (fence) {
      result += line;
      const closing = new RegExp(
        `^ {0,3}${fence.character}{${fence.length},}[ \\t]*$`,
      );
      if (closing.test(content)) {
        fence = null;
      }
    } else if (opening) {
      result += transform(outside, !hasFence, false);
      outside = "";
      result += line;
      hasFence = true;
      fence = {
        character: opening[1][0],
        length: opening[1].length,
      };
    } else {
      outside += line;
    }
  }

  result += transform(outside, !hasFence, true);
  return result;
}

export function getInitialPostEditorState(
  markdown: string,
): { mode: "rich" | "markdown"; notice: string | null } {
  const markdownManager = new MarkdownManager({
    extensions: createPostEditorExtensions(),
  });
  const parsed = markdownManager.parse(markdown);
  const serialized = markdownManager.serialize(parsed);
  if (
    normalizeMarkdownForComparison(serialized) ===
    normalizeMarkdownForComparison(markdown)
  ) {
    return { mode: "rich", notice: null };
  }
  return { mode: "markdown", notice: "Rich mode may reformat this post" };
}
