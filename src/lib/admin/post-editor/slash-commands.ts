import type { Editor } from "@tiptap/core";

export type SlashCommand = {
  id: string;
  label: string;
  keywords: readonly string[];
  execute(editor: Editor): void;
};

const slashCommands: readonly SlashCommand[] = [
  {
    id: "paragraph",
    label: "Paragraph",
    keywords: ["text", "plain"],
    execute: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    id: "heading-1",
    label: "Heading 1",
    keywords: ["h1", "title"],
    execute: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "heading-2",
    label: "Heading 2",
    keywords: ["h2", "subtitle"],
    execute: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "heading-3",
    label: "Heading 3",
    keywords: ["h3"],
    execute: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "bullet-list",
    label: "Bullet list",
    keywords: ["bullets", "unordered"],
    execute: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: "ordered-list",
    label: "Numbered list",
    keywords: ["numbered", "ordered"],
    execute: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "blockquote",
    label: "Blockquote",
    keywords: ["quote"],
    execute: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "code-block",
    label: "Code block",
    keywords: ["code", "preformatted"],
    execute: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "horizontal-rule",
    label: "Horizontal rule",
    keywords: ["divider", "separator"],
    execute: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: "table",
    label: "Table",
    keywords: ["grid", "rows", "columns"],
    execute: (editor) =>
      editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run(),
  },
  {
    id: "image",
    label: "Image",
    keywords: ["picture", "photo"],
    execute: (editor) => editor.chain().focus().run(),
  },
];

export function getPostEditorSlashItems(query: string): readonly SlashCommand[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return slashCommands;

  return slashCommands.filter(({ label, keywords }) =>
    [label, ...keywords].some((term) =>
      term.toLowerCase().includes(normalizedQuery),
    ),
  );
}
