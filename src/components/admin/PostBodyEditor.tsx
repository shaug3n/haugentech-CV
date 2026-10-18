"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect, useMemo, useState, type ReactElement } from "react";
import {
  createPostEditorExtensions,
  getInitialPostEditorState,
  parsePostMarkdown,
  serializePostMarkdown,
} from "@/lib/admin/post-editor/markdown";
import { usePostEditFormContext } from "@/components/admin/post-editor/form-context";
import { EditorToolbar } from "@/components/admin/post-editor/EditorToolbar";
import { createSlashCommandExtension } from "@/components/admin/post-editor/SlashMenu";

export function PostBodyEditor({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
}): ReactElement {
  const initialMarkdown = defaultValue ?? "";
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [mode, setMode] = useState<"rich" | "markdown">("rich");
  const [notice, setNotice] = useState<string | null>(null);
  const { markDirty } = usePostEditFormContext();
  useEffect(() => {
    const initialState = getInitialPostEditorState(initialMarkdown);
    setMode(initialState.mode);
    setNotice(initialState.notice);
  }, [initialMarkdown]);
  const extensions = useMemo(
    () => [...createPostEditorExtensions(), createSlashCommandExtension()],
    [],
  );
  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: initialMarkdown,
    contentType: "markdown",
    onUpdate: ({ editor: currentEditor }) => {
      setMarkdown(currentEditor.getMarkdown());
      markDirty();
    },
  });

  const changeMode = (nextMode: "rich" | "markdown") => {
    if (nextMode === mode) return;
    if (nextMode === "markdown") {
      const nextMarkdown = editor?.getMarkdown() ?? markdown;
      setMarkdown(nextMarkdown);
      setMode(nextMode);
    } else {
      const document = parsePostMarkdown(markdown);
      editor?.commands.setContent(document, { emitUpdate: false });
      setMarkdown(serializePostMarkdown(document));
      setMode(nextMode);
      setNotice(null);
    }
    markDirty();
  };

  return (
    <div className="text-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-medium">{label}</span>
      </div>
      {notice && (
        <p className="mb-2 text-xs text-amber-800" role="status">
          {notice}
        </p>
      )}
      {mode === "rich" && editor && (
        <>
          <EditorToolbar editor={editor} mode={mode} onModeChange={changeMode} />
          <div className="post-editor prose-md min-h-80 rounded-lg border border-neutral-300 px-3 py-2">
            <EditorContent editor={editor} />
          </div>
        </>
      )}
      {mode === "markdown" && (
        <>
          {editor && (
            <EditorToolbar editor={editor} mode={mode} onModeChange={changeMode} />
          )}
          <textarea
            value={markdown}
            onChange={(event) => {
              setMarkdown(event.target.value);
              markDirty();
            }}
            rows={16}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs"
          />
        </>
      )}
      <input type="hidden" name={name} value={markdown} />
    </div>
  );
}
