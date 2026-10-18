import { POST_IMAGE_MIME_TYPES } from "@/lib/admin/image-prep";

type PostImageMimeType = (typeof POST_IMAGE_MIME_TYPES)[number];

function matchesAscii(bytes: Uint8Array, offset: number, text: string): boolean {
  return [...text].every(
    (character, index) => bytes[offset + index] === character.charCodeAt(0),
  );
}

export function sniffPostImageMime(bytes: Uint8Array): PostImageMimeType | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    matchesAscii(bytes, 1, "PNG\r\n\u001a\n")
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 6 &&
    (matchesAscii(bytes, 0, "GIF87a") || matchesAscii(bytes, 0, "GIF89a"))
  ) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    matchesAscii(bytes, 0, "RIFF") &&
    matchesAscii(bytes, 8, "WEBP")
  ) {
    return "image/webp";
  }
  return null;
}
