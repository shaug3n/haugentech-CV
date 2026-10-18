export const POST_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

export const MAX_RAW_IMAGE_BYTES = 20 * 1024 * 1024;
export const MAX_UPLOAD_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_IMAGE_SIDE = 2000;

export type ImagePrepDecision =
  | { kind: "reject"; error: string }
  | { kind: "passthrough" }
  | { kind: "webp"; width: number; height: number };

function getInputError(mimeType: string, rawBytes: number): string | undefined {
  if (!POST_IMAGE_MIME_TYPES.includes(mimeType as (typeof POST_IMAGE_MIME_TYPES)[number])) {
    return "Only JPEG, PNG, WebP, or GIF images are supported.";
  }
  if (!Number.isFinite(rawBytes) || rawBytes <= 0) {
    return "Unable to read this image.";
  }
  if (rawBytes > MAX_RAW_IMAGE_BYTES) {
    return "Images must be 20 MB or smaller.";
  }
  if (mimeType === "image/gif" && rawBytes > MAX_UPLOAD_IMAGE_BYTES) {
    return "GIFs must be 4 MB or smaller.";
  }
  return undefined;
}

export function decideImagePrep(input: {
  mimeType: string;
  rawBytes: number;
  width?: number;
  height?: number;
}): ImagePrepDecision {
  const inputError = getInputError(input.mimeType, input.rawBytes);
  if (inputError) return { kind: "reject", error: inputError };
  if (input.mimeType === "image/gif") return { kind: "passthrough" };

  const { width, height } = input;
  if (
    width === undefined ||
    height === undefined ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return { kind: "reject", error: "Unable to read this image." };
  }

  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(width, height));
  return {
    kind: "webp",
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function encodeWebpWithRetry(
  encode: (quality: number) => Promise<Blob>,
): Promise<{ blob: Blob } | { error: string }> {
  let blob: Blob;
  try {
    blob = await encode(0.82);
    if (blob.size > MAX_UPLOAD_IMAGE_BYTES) {
      blob = await encode(0.65);
    }
  } catch {
    return { error: "Unable to read this image." };
  }

  if (blob.size > MAX_UPLOAD_IMAGE_BYTES) {
    return { error: "Image could not be compressed below 4 MB." };
  }
  return { blob };
}

function webpFileName(name: string): string {
  const extensionIndex = name.lastIndexOf(".");
  const stem = extensionIndex > 0 ? name.slice(0, extensionIndex) : name;
  return `${stem}.webp`;
}

export async function preparePostImage(
  file: File,
): Promise<{ file: File } | { error: string }> {
  const inputError = getInputError(file.type, file.size);
  if (inputError) return { error: inputError };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { error: "Unable to read this image." };
  }

  try {
    if (file.type === "image/gif") {
      if (
        !Number.isFinite(bitmap.width) ||
        !Number.isFinite(bitmap.height) ||
        bitmap.width <= 0 ||
        bitmap.height <= 0
      ) {
        return { error: "Unable to read this image." };
      }
      return { file };
    }

    const decision = decideImagePrep({
      mimeType: file.type,
      rawBytes: file.size,
      width: bitmap.width,
      height: bitmap.height,
    });
    if (decision.kind === "reject") return { error: decision.error };
    if (decision.kind === "passthrough") return { file };

    const canvas = document.createElement("canvas");
    canvas.width = decision.width;
    canvas.height = decision.height;
    const context = canvas.getContext("2d");
    if (!context) return { error: "Unable to read this image." };
    context.drawImage(bitmap, 0, 0, decision.width, decision.height);

    const result = await encodeWebpWithRetry(
      (quality) =>
        new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Image encoding failed."))),
            "image/webp",
            quality,
          );
        }),
    );
    if ("error" in result) return result;

    return {
      file: new File([result.blob], webpFileName(file.name), { type: "image/webp" }),
    };
  } catch {
    return { error: "Unable to read this image." };
  } finally {
    bitmap.close();
  }
}
