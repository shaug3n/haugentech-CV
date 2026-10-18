"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Code,
  ImagePlus,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Table,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type EditorToolbarProps = {
  editor: Editor;
  mode: "rich" | "markdown";
  onModeChange(mode: "rich" | "markdown"): void;
  onInsertImage(): void;
  hasPendingUploads: boolean;
};

type BlockStyle = "paragraph" | "h1" | "h2" | "h3";

type ToolbarButtonProps = {
  label: string;
  icon: LucideIcon;
  shortcut?: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick(): void;
};

type KeyLabels = { mod: string; shift: string; alt: string };

function getKeyLabels(): KeyLabels {
  const isApple =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  return isApple
    ? { mod: "⌘", shift: "⇧", alt: "⌥" }
    : { mod: "Ctrl+", shift: "Shift+", alt: "Alt+" };
}

function ToolbarButton({
  label,
  icon: Icon,
  shortcut,
  pressed,
  disabled,
  onClick,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      aria-keyshortcuts={shortcut}
      disabled={disabled}
      title={shortcut ? `${label} (${shortcut})` : label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-35 ${
        pressed
          ? "bg-primary-faint text-primary"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 disabled:hover:bg-transparent"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
    </button>
  );
}

function ToolbarGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-0.5">
      {children}
    </div>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px shrink-0 bg-neutral-200" aria-hidden="true" />;
}

function getSafeLinkUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function useStuck() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return { sentinelRef, stuck };
}

export function EditorToolbar({
  editor,
  mode,
  onModeChange,
  onInsertImage,
  hasPendingUploads,
}: EditorToolbarProps) {
  const { sentinelRef, stuck } = useStuck();
  const [{ mod, shift, alt }] = useState(getKeyLabels);
  const active = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      blockStyle: (currentEditor.isActive("heading", { level: 1 })
        ? "h1"
        : currentEditor.isActive("heading", { level: 2 })
          ? "h2"
          : currentEditor.isActive("heading", { level: 3 })
            ? "h3"
            : "paragraph") as BlockStyle,
      bold: currentEditor.isActive("bold"),
      italic: currentEditor.isActive("italic"),
      strike: currentEditor.isActive("strike"),
      code: currentEditor.isActive("code"),
      bulletList: currentEditor.isActive("bulletList"),
      orderedList: currentEditor.isActive("orderedList"),
      blockquote: currentEditor.isActive("blockquote"),
      codeBlock: currentEditor.isActive("codeBlock"),
      link: currentEditor.isActive("link"),
      canUndo: currentEditor.can().undo(),
      canRedo: currentEditor.can().redo(),
    }),
  });

  const promptForLink = () => {
    const current = editor.getAttributes("link").href ?? "";
    const value = window.prompt("Link URL (leave empty to remove)", current);
    if (value === null) return;
    if (!value.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = getSafeLinkUrl(value);
    if (href) editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };

  const setBlockStyle = (value: BlockStyle) => {
    const chain = editor.chain().focus();
    if (value === "paragraph") chain.setParagraph().run();
    else chain.setHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 }).run();
  };

  const markdownDisabled = mode === "rich" && hasPendingUploads;

  return (
    <>
      <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      <div
        role="toolbar"
        aria-label="Post formatting"
        data-stuck={stuck}
        className={`sticky top-0 z-20 -mt-px flex flex-wrap items-center gap-y-1 border-b border-neutral-200 bg-white/95 px-1.5 py-1 backdrop-blur supports-[backdrop-filter]:bg-white/80 ${
          stuck ? "rounded-none shadow-md" : "rounded-t-lg"
        }`}
      >
        {mode === "rich" && (
          <>
            <ToolbarGroup label="Block style">
              <select
                aria-label="Block style"
                title={`Block style (${mod}${alt}1–3)`}
                value={active.blockStyle}
                onChange={(event) => setBlockStyle(event.target.value as BlockStyle)}
                className="h-8 rounded-md border-0 bg-transparent pr-7 pl-2 text-sm text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-primary"
              >
                <option value="paragraph">Paragraph</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
              </select>
            </ToolbarGroup>
            <Divider />
            <ToolbarGroup label="Text formatting">
              <ToolbarButton
                label="Bold"
                icon={Bold}
                shortcut={`${mod}B`}
                pressed={active.bold}
                onClick={() => editor.chain().focus().toggleBold().run()}
              />
              <ToolbarButton
                label="Italic"
                icon={Italic}
                shortcut={`${mod}I`}
                pressed={active.italic}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              />
              <ToolbarButton
                label="Strike"
                icon={Strikethrough}
                shortcut={`${mod}${shift}S`}
                pressed={active.strike}
                onClick={() => editor.chain().focus().toggleStrike().run()}
              />
              <ToolbarButton
                label="Inline code"
                icon={Code}
                shortcut={`${mod}E`}
                pressed={active.code}
                onClick={() => editor.chain().focus().toggleCode().run()}
              />
              <ToolbarButton
                label="Link"
                icon={Link}
                pressed={active.link}
                onClick={promptForLink}
              />
            </ToolbarGroup>
            <Divider />
            <ToolbarGroup label="Blocks">
              <ToolbarButton
                label="Bullet list"
                icon={List}
                shortcut={`${mod}${shift}8`}
                pressed={active.bulletList}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              />
              <ToolbarButton
                label="Numbered list"
                icon={ListOrdered}
                shortcut={`${mod}${shift}7`}
                pressed={active.orderedList}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              />
              <ToolbarButton
                label="Blockquote"
                icon={Quote}
                shortcut={`${mod}${shift}B`}
                pressed={active.blockquote}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
              />
              <ToolbarButton
                label="Code block"
                icon={SquareCode}
                shortcut={`${mod}${alt}C`}
                pressed={active.codeBlock}
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              />
            </ToolbarGroup>
            <Divider />
            <ToolbarGroup label="Insert">
              <ToolbarButton label="Insert image" icon={ImagePlus} onClick={onInsertImage} />
              <ToolbarButton
                label="Table"
                icon={Table}
                onClick={() =>
                  editor
                    .chain()
                    .focus()
                    .insertTable({ rows: 2, cols: 2, withHeaderRow: true })
                    .run()
                }
              />
            </ToolbarGroup>
            <Divider />
            <ToolbarGroup label="History">
              <ToolbarButton
                label="Undo"
                icon={Undo2}
                shortcut={`${mod}Z`}
                disabled={!active.canUndo}
                onClick={() => editor.chain().focus().undo().run()}
              />
              <ToolbarButton
                label="Redo"
                icon={Redo2}
                shortcut={`${mod}${shift}Z`}
                disabled={!active.canRedo}
                onClick={() => editor.chain().focus().redo().run()}
              />
            </ToolbarGroup>
          </>
        )}
        <div
          role="group"
          aria-label="Editor mode"
          className="ml-auto flex shrink-0 items-center rounded-md bg-neutral-100 p-0.5 text-xs font-medium"
        >
          {(["rich", "markdown"] as const).map((value) => {
            const selected = mode === value;
            const disabled = value === "markdown" && markdownDisabled;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                disabled={disabled}
                title={disabled ? "Wait for image uploads to finish" : undefined}
                onClick={() => onModeChange(value)}
                className={`rounded px-2.5 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40 ${
                  selected
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {value === "rich" ? "Rich" : "Markdown"}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
