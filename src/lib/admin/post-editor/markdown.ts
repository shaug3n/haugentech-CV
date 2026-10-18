import { Editor, type Extensions, type JSONContent } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { Markdown, MarkdownManager } from "@tiptap/markdown";
import { Placeholder } from "@tiptap/extensions";
import { StarterKit } from "@tiptap/starter-kit";

export function createPostEditorExtensions(): Extensions {
  return [
    StarterKit.configure({ link: { openOnClick: false } }),
    Image.configure({ inline: false, allowBase64: false }),
    Placeholder.configure({ placeholder: "Write something…" }),
    TableKit,
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
  return normalizeSerializedMarkdown(editor.getMarkdown());
}

function normalizeSerializedMarkdown(markdown: string): string {
  return mapMarkdownOutsideCodeFences(markdown, (outside, isStart) => {
    let normalized = outside
      .replace(
        /!\[([\s\S]*?)\]\(([^)]*)\)/g,
        (_, alt: string, destination: string) =>
          `![${alt.replace(/(?<!\\)([\[\]])/g, "\\$1")}](${destination})`,
      )
      .replace(/(^|\|) ([^|\n]*?) {2,}(?=\|)/g, "$1 $2 ")
      .replace(/\n{3,}/g, "\n\n");

    if (isStart) {
      normalized = normalized.replace(/^(?:[ \t]*\n)+/, "");
    }
    return normalized;
  });
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
  const serialized = normalizeSerializedMarkdown(
    markdownManager.serialize(parsed),
  );
  if (
    normalizeMarkdownForComparison(serialized) ===
    normalizeMarkdownForComparison(markdown)
  ) {
    return { mode: "rich", notice: null };
  }
  return { mode: "markdown", notice: "Rich mode may reformat this post" };
}
