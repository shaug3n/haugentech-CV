import { Editor, type Extensions, type JSONContent } from "@tiptap/core";
import { Image } from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
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
    return normalizeSerializedMarkdown(editor.getMarkdown());
  } finally {
    editor.destroy();
  }
}

function normalizeSerializedMarkdown(markdown: string): string {
  return markdown
    .replace(
      /!\[([\s\S]*?)\]\(([^)]*)\)/g,
      (_, alt: string, destination: string) =>
        `![${alt.replace(/(?<!\\)\]/g, "\\]")}](${destination})`,
    )
    .replace(/(^|\|) ([^|\n]*?) {2,}(?=\|)/g, "$1 $2 ");
}

function normalizeMarkdownForComparison(markdown: string): string {
  return markdown
    .replace(/\r\n?/g, "\n")
    .replace(/\n[ \t]*(?:\n[ \t]*)*$/, "");
}

export function getInitialPostEditorState(
  markdown: string,
): { mode: "rich" | "markdown"; notice: string | null } {
  const parsed = parsePostMarkdown(markdown);
  const serialized = serializePostMarkdown(parsed);
  if (
    normalizeMarkdownForComparison(serialized) ===
    normalizeMarkdownForComparison(markdown)
  ) {
    return { mode: "rich", notice: null };
  }
  return { mode: "markdown", notice: "Rich mode may reformat this post" };
}
