import { Editor, type Extensions, type JSONContent } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Markdown, MarkdownManager } from "@tiptap/markdown";
import { Placeholder } from "@tiptap/extensions";
import { StarterKit } from "@tiptap/starter-kit";

export function createPostEditorExtensions(): Extensions {
  return [
    StarterKit.configure({ link: { openOnClick: false } }),
    Image.extend({
      renderMarkdown(node) {
        const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
        const src = typeof node.attrs?.src === "string" ? node.attrs.src : "";
        const title = typeof node.attrs?.title === "string" ? ` "${node.attrs.title}"` : "";
        return `![${alt.replace(/([\[\]])/g, "\\$1")}](${src}${title})`;
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
              ? helpers.renderChildren(cell.content ?? []).trim()
              : "";
            return text.replace(/(^|[^\\])\|/g, "$1\\|");
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
          ...(header ? [cells[0]] : []),
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
    const document = editor.getJSON();
    normalizeImageAltText(document);
    return document;
  } finally {
    editor.destroy();
  }
}

function normalizeImageAltText(node: JSONContent): void {
  if (node.type === "image" && typeof node.attrs?.alt === "string") {
    node.attrs.alt = node.attrs.alt.replace(/\\\\/g, "\\");
  }
  node.content?.forEach(normalizeImageAltText);
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
  normalizeImageAltText(parsed);
  const serialized = markdownManager.serialize(parsed);
  if (
    normalizeMarkdownForComparison(serialized) ===
    normalizeMarkdownForComparison(markdown)
  ) {
    return { mode: "rich", notice: null };
  }
  return { mode: "markdown", notice: "Rich mode may reformat this post" };
}
