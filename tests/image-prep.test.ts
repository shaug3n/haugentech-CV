// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decideImagePrep,
  encodeWebpWithRetry,
  MAX_IMAGE_SIDE,
  MAX_RAW_IMAGE_BYTES,
  MAX_UPLOAD_IMAGE_BYTES,
  POST_IMAGE_MIME_TYPES,
  preparePostImage,
} from "@/lib/admin/image-prep";

function blobOfSize(size: number): Blob {
  return new Blob([new Uint8Array(size)]);
}

describe("post image preparation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("allows only the four approved image MIME types", () => {
    for (const mimeType of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
      expect(
        decideImagePrep({ mimeType, rawBytes: 100, width: 100, height: 100 }).kind,
      ).not.toBe("reject");
    }

    expect(POST_IMAGE_MIME_TYPES).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ]);
  });

  it("resizes to 2000 px without upscaling and enforces inclusive input caps", () => {
    expect(
      decideImagePrep({
        mimeType: "image/png",
        rawBytes: 20 * 1024 * 1024,
        width: 4000,
        height: 2000,
      }),
    ).toMatchObject({ kind: "webp", width: 2000, height: 1000 });
    expect(
      decideImagePrep({
        mimeType: "image/png",
        rawBytes: 20 * 1024 * 1024 + 1,
        width: 4000,
        height: 2000,
      }).kind,
    ).toBe("reject");
    expect(decideImagePrep({ mimeType: "image/png", rawBytes: 0 })).toEqual({
      kind: "reject",
      error: "Unable to read this image.",
    });
    expect(
      decideImagePrep({
        mimeType: "image/png",
        rawBytes: 100,
        width: 500,
        height: 300,
      }),
    ).toMatchObject({ kind: "webp", width: 500, height: 300 });
    expect(decideImagePrep({ mimeType: "image/svg+xml", rawBytes: 100 })).toEqual({
      kind: "reject",
      error: "Only JPEG, PNG, WebP, or GIF images are supported.",
    });
    expect(
      decideImagePrep({
        mimeType: "image/gif",
        rawBytes: 4 * 1024 * 1024,
      }).kind,
    ).toBe("passthrough");
    expect(
      decideImagePrep({
        mimeType: "image/gif",
        rawBytes: 4 * 1024 * 1024 + 1,
      }),
    ).toEqual({ kind: "reject", error: "GIFs must be 4 MB or smaller." });

    expect(MAX_RAW_IMAGE_BYTES).toBe(20 * 1024 * 1024);
    expect(MAX_UPLOAD_IMAGE_BYTES).toBe(4 * 1024 * 1024);
    expect(MAX_IMAGE_SIDE).toBe(2000);
  });

  it("rejects invalid decoded dimensions", () => {
    expect(
      decideImagePrep({
        mimeType: "image/png",
        rawBytes: 100,
        width: 0,
        height: 100,
      }),
    ).toEqual({ kind: "reject", error: "Unable to read this image." });
    expect(
      decideImagePrep({
        mimeType: "image/png",
        rawBytes: 100,
        width: Number.NaN,
        height: 100,
      }).kind,
    ).toBe("reject");
  });

  it("re-encodes an oversized WebP once at lower quality", async () => {
    const exact = blobOfSize(4 * 1024 * 1024);
    const encodeExact = vi.fn().mockResolvedValue(exact);
    expect(await encodeWebpWithRetry(encodeExact)).toEqual({ blob: exact });
    expect(encodeExact).toHaveBeenCalledOnce();
    expect(encodeExact).toHaveBeenCalledWith(0.82);

    const small = blobOfSize(100);
    const encodeRetry = vi
      .fn()
      .mockResolvedValueOnce(blobOfSize(4 * 1024 * 1024 + 1))
      .mockResolvedValueOnce(small);
    expect(await encodeWebpWithRetry(encodeRetry)).toEqual({ blob: small });
    expect(encodeRetry).toHaveBeenNthCalledWith(1, 0.82);
    expect(encodeRetry).toHaveBeenNthCalledWith(2, 0.65);

    const encodeTooLarge = vi
      .fn()
      .mockResolvedValueOnce(blobOfSize(4 * 1024 * 1024 + 1))
      .mockResolvedValueOnce(blobOfSize(4 * 1024 * 1024 + 1));
    expect(await encodeWebpWithRetry(encodeTooLarge)).toEqual({
      error: "Image could not be compressed below 4 MB.",
    });
  });

  it("rejects an undecodable allowed-MIME image", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(new Error("decode failed")),
    );
    const file = new File(["corrupt"], "photo.png", { type: "image/png" });
    await expect(preparePostImage(file)).resolves.toEqual({
      error: "Unable to read this image.",
    });
  });

  it("rejects bad MIME and raw-size inputs before decoding", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);
    const unsupported = new File(["image"], "photo.svg", { type: "image/svg+xml" });
    const oversized = new File(
      [new Uint8Array(MAX_RAW_IMAGE_BYTES + 1)],
      "photo.png",
      { type: "image/png" },
    );

    await expect(preparePostImage(unsupported)).resolves.toEqual({
      error: "Only JPEG, PNG, WebP, or GIF images are supported.",
    });
    await expect(preparePostImage(oversized)).resolves.toEqual({
      error: "Images must be 20 MB or smaller.",
    });
    expect(decode).not.toHaveBeenCalled();
  });

  it("returns GIF files unchanged", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);
    const file = new File(["gif"], "animation.gif", { type: "image/gif" });

    await expect(preparePostImage(file)).resolves.toEqual({ file });
    expect(decode).not.toHaveBeenCalled();
  });

  it("encodes non-GIF files as named WebP and closes the bitmap", async () => {
    const bitmap = { width: 4000, height: 2000, close: vi.fn() };
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue(bitmap));
    const outputBlob = new Blob(["webp data"], { type: "image/webp" });
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({ drawImage: vi.fn() }),
      toBlob: vi.fn((callback: BlobCallback) => callback(outputBlob)),
    };
    const createElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(
      (tagName: string, options?: ElementCreationOptions) =>
        (tagName === "canvas"
          ? canvas
          : createElement(tagName, options)) as HTMLElement,
    );
    const file = new File(["png"], "photo.png", { type: "image/png" });

    const result = await preparePostImage(file);

    expect(result).toHaveProperty("file");
    if ("file" in result) {
      expect(result.file.name).toBe("photo.webp");
      expect(result.file.type).toBe("image/webp");
    }
    expect(canvas).toMatchObject({ width: 2000, height: 1000 });
    expect(canvas.toBlob).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.82);
    expect(bitmap.close).toHaveBeenCalledOnce();
  });
});
