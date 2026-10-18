"use client";

import type { Editor } from "@tiptap/core";
import { uploadPostImage } from "@/app/admin/posts/image-actions";
import { preparePostImage } from "@/lib/admin/image-prep";
import { findUploadPlaceholder } from "@/lib/admin/post-editor/upload-state";

export type ImageUploadCallbacks = {
  onPendingChange?(id: string, pending: boolean): void;
  onError?(message: string): void;
};

function createUploadId(): string {
  return globalThis.crypto.randomUUID();
}

function removePlaceholder(editor: Editor, id: string): void {
  const position = findUploadPlaceholder(editor, id);
  if (position === null) return;
  const node = editor.state.doc.nodeAt(position);
  if (!node) return;
  editor.view.dispatch(
    editor.state.tr.delete(position, position + node.nodeSize),
  );
}

function replacePlaceholder(
  editor: Editor,
  id: string,
  source: string,
  alt: string,
): number | null {
  const position = findUploadPlaceholder(editor, id);
  if (position === null) return null;
  const placeholder = editor.state.doc.nodeAt(position);
  const image = editor.schema.nodes.image.create({ src: source, alt });
  if (!placeholder || !image) return null;
  editor.view.dispatch(
    editor.state.tr.replaceWith(position, position + placeholder.nodeSize, image),
  );
  return position;
}

export async function uploadImageAtPosition(
  editor: Editor,
  file: File,
  position: number,
  callbacks: ImageUploadCallbacks = {},
): Promise<void> {
  const id = createUploadId();
  const safePosition = Math.max(0, Math.min(position, editor.state.doc.content.size));
  editor.commands.insertContentAt(safePosition, {
    type: "imageUploadPlaceholder",
    attrs: { id },
  });
  callbacks.onPendingChange?.(id, true);

  try {
    const prepared = await preparePostImage(file);
    if ("error" in prepared) {
      removePlaceholder(editor, id);
      callbacks.onError?.(prepared.error);
      return;
    }
    if (findUploadPlaceholder(editor, id) === null) return;

    const formData = new FormData();
    formData.set("file", prepared.file);
    const result = await uploadPostImage(formData);
    if ("error" in result) {
      removePlaceholder(editor, id);
      callbacks.onError?.(result.error);
      return;
    }

    const imagePosition = replacePlaceholder(editor, id, result.url, "");
    if (imagePosition !== null) {
      const alt = window.prompt("Alt text for this image") ?? "";
      const image = editor.state.doc.nodeAt(imagePosition);
      if (image?.type.name === "image") {
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(imagePosition, undefined, {
            src: result.url,
            alt,
          }),
        );
      }
    }
  } catch {
    removePlaceholder(editor, id);
    callbacks.onError?.("Image upload failed. Please try again.");
  } finally {
    callbacks.onPendingChange?.(id, false);
  }
}
