"use client";

import type { Editor } from "@tiptap/core";

type EditorToolbarProps = {
  editor: Editor;
  mode: "rich" | "markdown";
  onModeChange(mode: "rich" | "markdown"): void;
  onInsertImage(): void;
  hasPendingUploads: boolean;
};

type ToolbarButtonProps = {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  title?: string;
  onClick(): void;
};

function ToolbarButton({
  label,
  pressed,
  disabled,
  title,
  onClick,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`rounded px-2 py-1 text-xs hover:bg-neutral-100 ${
        pressed ? "bg-neutral-200 font-semibold" : ""
      }`}
    >
      {label}
    </button>
  );
}

function getSafeLinkUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

export function EditorToolbar({
  editor,
  mode,
  onModeChange,
  onInsertImage,
  hasPendingUploads,
}: EditorToolbarProps) {
  const promptForLink = () => {
    const value = window.prompt("Link URL");
    if (value === null) return;
    if (!value.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const href = getSafeLinkUrl(value);
    if (href) editor.chain().focus().setLink({ href }).run();
  };

  return (
    <div className="mb-2 flex flex-wrap items-center gap-1" role="toolbar" aria-label="Post formatting">
      {mode === "rich" && (
        <>
          <ToolbarButton
            label="Heading 1"
            pressed={editor.isActive("heading", { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          />
          <ToolbarButton
            label="Heading 2"
            pressed={editor.isActive("heading", { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <ToolbarButton
            label="Heading 3"
            pressed={editor.isActive("heading", { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          />
          <ToolbarButton
            label="Bold"
            pressed={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
          />
          <ToolbarButton
            label="Italic"
            pressed={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          />
          <ToolbarButton
            label="Strike"
            pressed={editor.isActive("strike")}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          />
          <ToolbarButton
            label="Inline code"
            pressed={editor.isActive("code")}
            onClick={() => editor.chain().focus().toggleCode().run()}
          />
          <ToolbarButton
            label="Bullet list"
            pressed={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          />
          <ToolbarButton
            label="Numbered list"
            pressed={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          />
          <ToolbarButton
            label="Blockquote"
            pressed={editor.isActive("blockquote")}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          />
          <ToolbarButton
            label="Code block"
            pressed={editor.isActive("codeBlock")}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          />
          <ToolbarButton
            label="Link"
            pressed={editor.isActive("link")}
            onClick={promptForLink}
          />
          <ToolbarButton
            label="Table"
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()
            }
          />
          <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()} />
          <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()} />
          <span className="mx-1 h-5 border-l border-neutral-300" aria-hidden="true" />
        </>
      )}
      {mode === "rich" && (
        <ToolbarButton label="Insert image" onClick={onInsertImage} />
      )}
      <ToolbarButton
        label="Rich"
        pressed={mode === "rich"}
        onClick={() => onModeChange("rich")}
      />
      <ToolbarButton
        label="Markdown"
        pressed={mode === "markdown"}
        disabled={mode === "rich" && hasPendingUploads}
        title={
          mode === "rich" && hasPendingUploads
            ? "Wait for image uploads to finish"
            : undefined
        }
        onClick={() => onModeChange("markdown")}
      />
    </div>
  );
}
