import { Extension, type Editor } from "@tiptap/core";
import { skipTrailingNodeMeta } from "@tiptap/extensions";
import { Plugin } from "@tiptap/pm/state";

export const pendingImageUploadIds = new Set<string>();

export const ImageUploadReconciliation = Extension.create({
  name: "imageUploadReconciliation",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(_transactions, _oldState, newState) {
          const stalePlaceholders: Array<{
            position: number;
            size: number;
            wrapper: boolean;
          }> = [];
          newState.doc.descendants((node, position) => {
            if (
              node.type.name === "imageUploadPlaceholder" &&
              !pendingImageUploadIds.has(node.attrs.id)
            ) {
              const parent = newState.doc.resolve(position).parent;
              const removeWrapper =
                node.attrs.rollbackWrapper === true &&
                parent.type.name === "paragraph" &&
                parent.childCount === 1;
              stalePlaceholders.push({
                position: removeWrapper ? position - 1 : position,
                size: removeWrapper ? parent.nodeSize : node.nodeSize,
                wrapper: removeWrapper,
              });
            }
          });
          if (stalePlaceholders.length === 0) return null;

          const transaction = newState.tr;
          for (const { position, size } of stalePlaceholders.reverse()) {
            transaction.delete(position, position + size);
          }
          if (stalePlaceholders.some(({ wrapper }) => wrapper)) {
            transaction.setMeta(skipTrailingNodeMeta, true);
          }
          return transaction.setMeta("addToHistory", false);
        },
      }),
    ];
  },
});

export type UploadStateAction =
  | { type: "start"; id: string }
  | { type: "finish"; id: string };

export function reduceUploadState(
  state: readonly string[],
  action: UploadStateAction,
): string[] {
  if (action.type === "start") {
    return state.includes(action.id) ? [...state] : [...state, action.id];
  }
  return state.filter((id) => id !== action.id);
}

export function findUploadPlaceholder(editor: Editor, id: string): number | null {
  let position: number | null = null;
  editor.state.doc.descendants((node, nodePosition) => {
    if (
      node.type.name === "imageUploadPlaceholder" &&
      node.attrs.id === id
    ) {
      position = nodePosition;
      return false;
    }
    return position === null;
  });
  return position;
}
