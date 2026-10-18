import { describe, expect, it } from "vitest";
import { getImageFiles } from "@/lib/admin/post-editor/image-files";

describe("post editor image files", () => {
  it("keeps only image files from a mixed file list", () => {
    const image = new File(["image"], "photo.png", { type: "image/png" });
    const unsupportedImage = new File(["image"], "vector.svg", {
      type: "image/svg+xml",
    });
    const text = new File(["text"], "notes.txt", { type: "text/plain" });
    const unknown = new File(["data"], "unknown", { type: "" });

    expect(getImageFiles([image, unsupportedImage, text, unknown])).toEqual([
      image,
      unsupportedImage,
    ]);
  });

  it("returns no files when the list contains no images", () => {
    const text = new File(["text"], "notes.txt", { type: "text/plain" });

    expect(getImageFiles([text])).toEqual([]);
  });
});
