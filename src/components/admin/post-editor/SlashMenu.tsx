"use client";

import { Extension, type Editor } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import {
  Suggestion,
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from "@tiptap/suggestion";
import {
  getPostEditorSlashItems,
  type SlashCommand,
} from "@/lib/admin/post-editor/slash-commands";

type SlashMenuProps = {
  items: readonly SlashCommand[];
  selectedIndex: number;
  onSelect(item: SlashCommand): void;
};

function SlashMenu({ items, selectedIndex, onSelect }: SlashMenuProps) {
  if (!items.length) return null;

  return (
    <div className="post-editor-slash-menu" role="listbox" aria-label="Insert block">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={selectedIndex === index}
          className={`block w-full rounded px-3 py-2 text-left text-sm ${
            selectedIndex === index ? "bg-neutral-100" : "hover:bg-neutral-50"
          }`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(item)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

type SlashMenuState = {
  items: readonly SlashCommand[];
  selectedIndex: number;
  onSelect(item: SlashCommand): void;
};

function positionPopup(renderer: ReactRenderer, props: SuggestionProps<SlashCommand>) {
  const rect = props.clientRect?.();
  if (!rect) return;
  Object.assign(renderer.element.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.bottom + 4}px`,
    zIndex: "50",
  });
}

export function createSlashCommandExtension(
  onInsertImage: (editor: Editor) => void,
) {
  return Extension.create({
    name: "postSlashCommands",
    addProseMirrorPlugins() {
      const editor = this.editor;
      return [
        Suggestion({
          editor,
          char: "/",
          allowedPrefixes: [" ", "\n"],
          items: ({ query }) => [...getPostEditorSlashItems(query)],
          command: ({ editor: currentEditor, range, props }) => {
            currentEditor.chain().focus().deleteRange(range).run();
            if (props.id === "image") onInsertImage(currentEditor);
            else props.execute(currentEditor);
          },
          render: () => {
            let renderer: ReactRenderer | null = null;
            let currentProps: SuggestionProps<SlashCommand> | null = null;
            let state: SlashMenuState = {
              items: [],
              selectedIndex: 0,
              onSelect: () => {},
            };

            const update = (
              props: SuggestionProps<SlashCommand>,
              resetSelection: boolean,
            ) => {
              currentProps = props;
              state = {
                items: props.items,
                selectedIndex: resetSelection
                  ? 0
                  : Math.min(state.selectedIndex, Math.max(props.items.length - 1, 0)),
                onSelect: (item) => props.command(item),
              };
              if (!renderer) {
                renderer = new ReactRenderer(SlashMenu, { editor, props: state });
                document.body.appendChild(renderer.element);
              } else {
                renderer.updateProps(state);
              }
              positionPopup(renderer, props);
            };

            return {
              onStart: (props) => update(props, true),
              onUpdate: (props) => update(props, false),
              onExit: () => {
                renderer?.destroy();
                renderer?.element.remove();
                renderer = null;
                currentProps = null;
              },
              onKeyDown: ({ event }: SuggestionKeyDownProps) => {
                if (!currentProps || !state.items.length) return event.key === "Escape";
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  state = {
                    ...state,
                    selectedIndex: (state.selectedIndex + 1) % state.items.length,
                  };
                  renderer?.updateProps(state);
                  return true;
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault();
                  state = {
                    ...state,
                    selectedIndex:
                      (state.selectedIndex - 1 + state.items.length) % state.items.length,
                  };
                  renderer?.updateProps(state);
                  return true;
                }
                if (event.key === "Enter") {
                  event.preventDefault();
                  state.onSelect(state.items[state.selectedIndex]);
                  return true;
                }
                return event.key === "Escape";
              },
            };
          },
        }),
      ];
    },
  });
}
