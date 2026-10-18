"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import type { Editor } from "@tiptap/core";
import {
  createPostEditorExtensions,
  getPostEditorMarkdown,
  getInitialPostEditorState,
  parsePostMarkdown,
  serializePostMarkdown,
} from "@/lib/admin/post-editor/markdown";
import { usePostEditFormContext } from "@/components/admin/post-editor/form-context";
import { EditorToolbar } from "@/components/admin/post-editor/EditorToolbar";
import { createSlashCommandExtension } from "@/components/admin/post-editor/SlashMenu";
import { ImageUploadPlaceholder } from "@/components/admin/post-editor/UploadPlaceholder";
import { uploadImageAtPosition } from "@/components/admin/post-editor/image-upload";
import {
  ImageUploadReconciliation,
  reduceUploadState,
} from "@/lib/admin/post-editor/upload-state";
import { getImageFiles } from "@/lib/admin/post-editor/image-files";

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
  const [initialEditorState] = useState(() =>
    getInitialPostEditorState(initialMarkdown),
  );
  const [mode, setMode] = useState(() => initialEditorState.mode);
  const [notice, setNotice] = useState(() => initialEditorState.notice);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingPositionRef = useRef<number | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const modeRef = useRef(mode);
  const pendingIdsRef = useRef<string[]>([]);
  const { markDirty, reportPendingUploads } = usePostEditFormContext();
  const openImagePicker = useCallback((currentEditor: Editor) => {
    pendingPositionRef.current = currentEditor.state.selection.from;
    fileInputRef.current?.click();
  }, []);
  const addImageFiles = useCallback(
    (currentEditor: Editor, files: FileList | File[], position: number) => {
      const selectedFiles = Array.from(files);
      if (!selectedFiles.length) return;
      setUploadError(null);
      selectedFiles.forEach((file, index) => {
        void uploadImageAtPosition(currentEditor, file, position + index, {
          onPendingChange: (id, pending) => {
            const nextPendingIds = reduceUploadState(pendingIdsRef.current, {
              type: pending ? "start" : "finish",
              id,
            });
            pendingIdsRef.current = nextPendingIds;
            setPendingIds(nextPendingIds);
          },
          onError: setUploadError,
        });
      });
    },
    [],
  );
  const extensions = useMemo(
    () => [
      ...createPostEditorExtensions(),
      ImageUploadPlaceholder,
      ImageUploadReconciliation,
      createSlashCommandExtension(openImagePicker),
    ],
    [openImagePicker],
  );
  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: initialMarkdown,
    contentType: "markdown",
    editorProps: {
      handleDrop: (view, event) => {
        const files = getImageFiles(event.dataTransfer?.files ?? []);
        if (!files.length) return false;
        event.preventDefault();
        const position =
          view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos ??
          view.state.selection.from;
        const currentEditor = editorRef.current;
        if (currentEditor) addImageFiles(currentEditor, files, position);
        return true;
      },
      handlePaste: (view, event) => {
        const files = getImageFiles(event.clipboardData?.files ?? []);
        if (!files.length) return false;
        event.preventDefault();
        const currentEditor = editorRef.current;
        if (currentEditor) {
          addImageFiles(currentEditor, files, view.state.selection.from);
        }
        return true;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (modeRef.current === "markdown") return;
      setMarkdown(getPostEditorMarkdown(currentEditor));
      markDirty();
    },
  });
  useEffect(() => {
    editorRef.current = editor;
    return () => {
      editorRef.current = null;
    };
  }, [editor]);
  useEffect(() => {
    reportPendingUploads(name, pendingIds.length);
  }, [name, pendingIds.length, reportPendingUploads]);
  useEffect(
    () => () => reportPendingUploads(name, 0),
    [name, reportPendingUploads],
  );

  const changeMode = (nextMode: "rich" | "markdown") => {
    if (nextMode === mode) return;
    if (nextMode === "markdown" && pendingIdsRef.current.length > 0) return;
    if (nextMode === "markdown") {
      const nextMarkdown = editor
        ? getPostEditorMarkdown(editor)
        : markdown;
      setMarkdown(nextMarkdown);
      modeRef.current = nextMode;
      setMode(nextMode);
    } else {
      const document = parsePostMarkdown(markdown);
      editor?.commands.setContent(document, { emitUpdate: false });
      setMarkdown(serializePostMarkdown(document));
      modeRef.current = nextMode;
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
          <div className="rounded-lg border border-neutral-300 bg-white transition-shadow focus-within:border-primary-soft focus-within:ring-2 focus-within:ring-primary-faint">
            <EditorToolbar
              editor={editor}
              mode={mode}
              onModeChange={changeMode}
              onInsertImage={() => openImagePicker(editor)}
              hasPendingUploads={pendingIds.length > 0}
            />
            <div className="post-editor prose-md min-h-80 px-4 py-3">
              <EditorContent editor={editor} />
            </div>
          </div>
          <BubbleMenu
            editor={editor}
            shouldShow={({ editor: currentEditor }) => currentEditor.isActive("image")}
            className="flex gap-1 rounded border border-neutral-300 bg-white p-1 shadow"
          >
            <button
              type="button"
              className="rounded px-2 py-1 text-xs hover:bg-neutral-100"
              onClick={() => {
                const currentAlt = editor.getAttributes("image").alt ?? "";
                const alt = window.prompt("Alt text for this image", currentAlt);
                if (alt !== null) {
                  editor.chain().focus().updateAttributes("image", { alt }).run();
                }
              }}
            >
              Edit alt
            </button>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs hover:bg-neutral-100"
              onClick={() => editor.chain().focus().deleteSelection().run()}
            >
              Remove image
            </button>
          </BubbleMenu>
        </>
      )}
      {mode === "markdown" && (
        <div className="rounded-lg border border-neutral-300 bg-white transition-shadow focus-within:border-primary-soft focus-within:ring-2 focus-within:ring-primary-faint">
          {editor && (
            <EditorToolbar
              editor={editor}
              mode={mode}
              onModeChange={changeMode}
              onInsertImage={() => openImagePicker(editor)}
              hasPendingUploads={pendingIds.length > 0}
            />
          )}
          <textarea
            value={markdown}
            onChange={(event) => {
              setMarkdown(event.target.value);
              markDirty();
            }}
            rows={16}
            aria-label={`${label} (Markdown)`}
            className="block w-full resize-y rounded-b-lg border-0 bg-transparent px-4 py-3 font-mono text-xs focus:outline-none"
          />
        </div>
      )}
      {uploadError && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {uploadError}
        </p>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        aria-label="Choose images to insert"
        onChange={(event) => {
          if (editor) {
            addImageFiles(
              editor,
              event.currentTarget.files ?? [],
              pendingPositionRef.current ?? editor.state.selection.from,
            );
          }
          pendingPositionRef.current = null;
          event.currentTarget.value = "";
        }}
      />
      <input type="hidden" name={name} value={markdown} />
    </div>
  );
}
