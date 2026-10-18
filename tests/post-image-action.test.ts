import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fakeAuth: { user: { email: string } | null } = { user: null };
const storageUpload = vi.fn();
const storageFailure = new Error("storage secret");
let serverFailure: Error | null = null;
const publicUrl =
  "https://project.supabase.co/storage/v1/object/public/media/posts/inline/test.webp";

const fakeClient = {
  auth: {
    getUser: async () => ({ data: { user: fakeAuth.user } }),
  },
  storage: {
    from: () => ({
      upload: (...args: unknown[]) => storageUpload(...args),
      getPublicUrl: () => ({ data: { publicUrl } }),
    }),
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServer: async () => {
    if (serverFailure) throw serverFailure;
    return fakeClient;
  },
}));

const { uploadPostImage } = await import("@/app/admin/posts/image-actions");

const ownerUser = { email: "owner@example.com" };
const otherUser = { email: "other@example.com" };
const validImage = new File(
  [new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])],
  "test.webp",
  { type: "image/webp" },
);

function formWithFile(file: File): FormData {
  const formData = new FormData();
  formData.set("file", file);
  return formData;
}

function fileOfType(type: string): File {
  return new File(
    [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    "test.png",
    { type },
  );
}

function fileOfSize(size: number): File {
  const bytes = new Uint8Array(size);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return new File([bytes], "test.png", { type: "image/png" });
}

describe("uploadPostImage", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fakeAuth.user = ownerUser;
    serverFailure = null;
    storageUpload.mockReset();
    storageUpload.mockResolvedValue({ error: null });
    process.env.ADMIN_EMAIL = ownerUser.email;
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a fixed generic error for a non-admin user", async () => {
    fakeAuth.user = otherUser;

    expect(await uploadPostImage(formWithFile(validImage)))
      .toEqual({ error: "Image upload failed. Please try again." });
    expect(await uploadPostImage(formWithFile(fileOfType("image/svg+xml"))))
      .toEqual({ error: "Image upload failed. Please try again." });
    expect(storageUpload).not.toHaveBeenCalled();
  });

  it("checks MIME type and the exact 4 MB file boundary", async () => {
    expect(await uploadPostImage(formWithFile(fileOfType("image/svg+xml"))))
      .toEqual({ error: "Unsupported image type." });
    expect(await uploadPostImage(formWithFile(fileOfSize(4 * 1024 * 1024 + 1))))
      .toEqual({ error: "Image must be 4 MB or smaller." });
    expect(await uploadPostImage(formWithFile(fileOfSize(4 * 1024 * 1024))))
      .toEqual({ url: publicUrl });
    expect(storageUpload).toHaveBeenCalledWith(
      expect.stringMatching(/^posts\/inline\//),
      expect.any(File),
    );
  });

  it("does not expose auth or Storage details", async () => {
    fakeAuth.user = null;
    expect(await uploadPostImage(formWithFile(validImage)))
      .toEqual({ error: "Image upload failed. Please try again." });

    fakeAuth.user = ownerUser;
    storageUpload.mockRejectedValue(storageFailure);
    expect(await uploadPostImage(formWithFile(validImage)))
      .toEqual({ error: "Image upload failed. Please try again." });
    expect(consoleError).toHaveBeenCalledWith(expect.any(String), storageFailure);

    serverFailure = new Error("server configuration secret");
    expect(await uploadPostImage(formWithFile(validImage)))
      .toEqual({ error: "Image upload failed. Please try again." });
  });

  it("rejects a missing or non-File field", async () => {
    const missingFile = new FormData();
    const stringFile = new FormData();
    stringFile.set("file", "not an image file");

    expect(await uploadPostImage(missingFile))
      .toEqual({ error: "Unsupported image type." });
    expect(await uploadPostImage(stringFile))
      .toEqual({ error: "Unsupported image type." });
    expect(storageUpload).not.toHaveBeenCalled();
  });

  it("rejects empty files and bytes whose signature disagrees with the declared MIME", async () => {
    const mislabeledSvg = new File(["<svg></svg>"], "image.png", { type: "image/png" });
    const emptyWebp = new File([], "empty.webp", { type: "image/webp" });

    expect(await uploadPostImage(formWithFile(mislabeledSvg))).toEqual({
      error: "Unsupported image type.",
    });
    expect(await uploadPostImage(formWithFile(emptyWebp))).toEqual({
      error: "Unsupported image type.",
    });
    expect(storageUpload).not.toHaveBeenCalled();
  });

  it.each([
    ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["image/jpeg", [0xff, 0xd8, 0xff]],
    ["image/gif", [..."GIF89a"].map((character) => character.charCodeAt(0))],
    ["image/webp", [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]],
  ])("accepts a %s signature", async (type, signature) => {
    const image = new File([new Uint8Array(signature)], "image", { type });

    expect(await uploadPostImage(formWithFile(image))).toEqual({ url: publicUrl });
  });
});
