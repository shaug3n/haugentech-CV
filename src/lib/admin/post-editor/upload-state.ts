import { Extension, type Editor } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";

export const pendingImageUploadIds = new Set<string>();

export const ImageUploadReconciliation = Extension.create({
  name: "imageUploadReconciliation",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(_transactions, _oldState, newState) {
          const stalePlaceholders: Array<{ position: number; size: number }> = [];
          newState.doc.descendants((node, position) => {
            if (
              node.type.name === "imageUploadPlaceholder" &&
              !pendingImageUploadIds.has(node.attrs.id)
            ) {
              stalePlaceholders.push({ position, size: node.nodeSize });
            }
          });
          if (stalePlaceholders.length === 0) return null;

          const transaction = newState.tr;
          for (const { position, size } of stalePlaceholders.reverse()) {
            transaction.delete(position, position + size);
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
