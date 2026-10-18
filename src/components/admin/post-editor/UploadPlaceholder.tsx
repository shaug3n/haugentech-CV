import { Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { ReactElement } from "react";

function UploadPlaceholder(): ReactElement {
  return (
    <NodeViewWrapper
      as="span"
      className="inline-flex h-8 w-8 items-center justify-center rounded border border-neutral-300 bg-neutral-50 align-middle"
      contentEditable={false}
      role="status"
      aria-label="Uploading image"
    >
      <span
        aria-hidden="true"
        className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700"
      />
    </NodeViewWrapper>
  );
}

export const ImageUploadPlaceholder = Node.create({
  name: "imageUploadPlaceholder",
  group: "inline",
  inline: true,
  atom: true,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      id: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-image-upload-placeholder]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      { ...HTMLAttributes, "data-image-upload-placeholder": "true" },
      "Uploading image…",
    ];
  },

  renderMarkdown() {
    return "";
  },

  addNodeView() {
    return ReactNodeViewRenderer(UploadPlaceholder);
  },
});
