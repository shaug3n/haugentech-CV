"use server";

import { MAX_UPLOAD_IMAGE_BYTES, POST_IMAGE_MIME_TYPES } from "@/lib/admin/image-prep";
import { requireUser, uploadImage } from "@/lib/admin/action-utils";
import { createSupabaseServer } from "@/lib/supabase/server";

const GENERIC_UPLOAD_ERROR = "Image upload failed. Please try again.";

export async function uploadPostImage(
  formData: FormData,
): Promise<{ url: string } | { error: string }> {
  try {
    const supabase = await createSupabaseServer();
    await requireUser(supabase);

    const file = formData.get("file");
    if (!(file instanceof File)) return { error: "Unsupported image type." };
    if (!POST_IMAGE_MIME_TYPES.includes(file.type as (typeof POST_IMAGE_MIME_TYPES)[number])) {
      return { error: "Unsupported image type." };
    }
    if (file.size > MAX_UPLOAD_IMAGE_BYTES) {
      return { error: "Image must be 4 MB or smaller." };
    }

    return { url: await uploadImage(supabase, file, "posts/inline") };
  } catch (error) {
    console.error("[admin image upload failed]", error);
    return { error: GENERIC_UPLOAD_ERROR };
  }
}
