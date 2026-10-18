// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPostEditorExtensions,
  getPostEditorMarkdown,
} from "@/lib/admin/post-editor/markdown";
import { ImageUploadPlaceholder } from "@/components/admin/post-editor/UploadPlaceholder";
import { findUploadPlaceholder } from "@/lib/admin/post-editor/upload-state";

const { preparePostImage, uploadPostImage } = vi.hoisted(() => ({
  preparePostImage: vi.fn(),
  uploadPostImage: vi.fn(),
}));

vi.mock("@/lib/admin/image-prep", () => ({ preparePostImage }));
vi.mock("@/app/admin/posts/image-actions", () => ({ uploadPostImage }));

const file = new File(["valid image"], "image.png", { type: "image/png" });

function makeEditor(): Editor {
  return new Editor({
    element: document.createElement("div"),
    extensions: [...createPostEditorExtensions(), ImageUploadPlaceholder],
    content: "",
  });
}

describe("inline image upload history", () => {
  beforeEach(() => {
    preparePostImage.mockReset().mockResolvedValue({ file });
    uploadPostImage.mockReset();
    vi.spyOn(window, "prompt").mockReturnValue("Alt");
  });

  it("undoes a completed upload without restoring its placeholder and redoes the image", async () => {
    let resolveUpload!: (result: { url: string }) => void;
    uploadPostImage.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    const editor = makeEditor();

    const upload = import("@/components/admin/post-editor/image-upload").then(
      ({ uploadImageAtPosition }) => uploadImageAtPosition(editor, file, 1),
    );
    await vi.waitFor(() => expect(uploadPostImage).toHaveBeenCalledOnce());
    const placeholderId = editor.state.doc.firstChild?.attrs.id;
    expect(placeholderId).toBeTruthy();

    await new Promise((resolve) => setTimeout(resolve, 600));
    resolveUpload({ url: "https://example.com/image.png" });
    await upload;

    editor.commands.undo();
    expect(findUploadPlaceholder(editor, placeholderId)).toBeNull();
    expect(getPostEditorMarkdown(editor)).not.toContain("https://example.com/image.png");

    editor.commands.redo();
    expect(getPostEditorMarkdown(editor)).toContain("![Alt](https://example.com/image.png)");
    expect(findUploadPlaceholder(editor, placeholderId)).toBeNull();
    editor.destroy();
  });

  it("does not restore a failed upload placeholder when the user undoes", async () => {
    let resolveUpload!: (result: { error: string }) => void;
    uploadPostImage.mockReturnValue(
      new Promise((resolve) => {
        resolveUpload = resolve;
      }),
    );
    const editor = makeEditor();

    const { uploadImageAtPosition } = await import(
      "@/components/admin/post-editor/image-upload"
    );
    const upload = uploadImageAtPosition(editor, file, 1);
    await vi.waitFor(() => expect(uploadPostImage).toHaveBeenCalledOnce());
    const placeholderId = editor.state.doc.firstChild?.attrs.id;
    await new Promise((resolve) => setTimeout(resolve, 600));
    resolveUpload({ error: "Image upload failed. Please try again." });
    await upload;

    editor.commands.undo();
    expect(findUploadPlaceholder(editor, placeholderId)).toBeNull();
    editor.destroy();
  });
});
