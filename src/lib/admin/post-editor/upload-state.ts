import type { Editor } from "@tiptap/core";

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
