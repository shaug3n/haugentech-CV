import { describe, expect, it } from "vitest";
import { sniffPostImageMime } from "@/lib/admin/image-signature";

describe("sniffPostImageMime", () => {
  it.each([
    ["image/jpeg", [0xff, 0xd8, 0xff]],
    ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["image/gif", [..."GIF87a"].map((character) => character.charCodeAt(0))],
    ["image/gif", [..."GIF89a"].map((character) => character.charCodeAt(0))],
    ["image/webp", [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]],
  ])("recognizes the %s signature", (mimeType, signature) => {
    expect(sniffPostImageMime(new Uint8Array(signature))).toBe(mimeType);
  });

  it.each([[], [0x89], [..."<svg></svg>"].map((character) => character.charCodeAt(0))])(
    "rejects unrecognized or incomplete image signatures",
    (bytes) => {
      expect(sniffPostImageMime(new Uint8Array(bytes))).toBeNull();
    },
  );
});
