"use server";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { createSupabaseServer } from "@/lib/supabase/server";
import { postSchema } from "@/lib/schemas";
import { formDataToRecord, requireUser, revalidateSite, uploadImage, withAdminAction } from "@/lib/admin/action-utils";

const PATH = "/admin/posts";

// Postgres unique_violation. `posts.slug` is the only unique constraint on the
// table, so a 23505 from a post write is always a slug collision — worth its own
// message, because "check the form values" gives the owner nothing to act on.
const UNIQUE_VIOLATION = "23505";

/** `?status=` value for a failed write: slug-specific when we can tell, generic otherwise. */
function statusFor(error: PostgrestError): string {
  return error.code === UNIQUE_VIOLATION ? "slug-taken" : "error";
}

// Posts is not built on `createCrudActions`: it carries the publish guard from
// postSchema, redirects to the per-post edit page rather than a list, stamps
// `published_at` on first publish, and reports duplicate slugs specifically.
export const createPost = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const parsed = postSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);
  const { data, error } = await supabase
    .from("posts")
    .insert({ ...parsed.data, published: false })
    .select("id")
    .single();
  if (error) redirect(`${PATH}?status=${statusFor(error)}`);
  if (!data) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}/${data.id}`);
});

export const updatePost = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const id = String(fd.get("id"));
  const parsed = postSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}/${id}?status=error`);

  const update: Record<string, unknown> = { ...parsed.data };

  const cover = fd.get("cover");
  if (cover instanceof File && cover.size > 0) {
    update.cover_image_url = await uploadImage(supabase, cover, "posts");
  }

  if (parsed.data.published) {
    const { data: existing, error: readError } = await supabase
      .from("posts").select("published_at").eq("id", id).single();
    if (readError) redirect(`${PATH}/${id}?status=error`);
    if (!existing?.published_at) update.published_at = new Date().toISOString();
  }

  const { error } = await supabase.from("posts").update(update).eq("id", id);
  if (error) redirect(`${PATH}/${id}?status=${statusFor(error)}`);
  revalidateSite();
  redirect(`${PATH}/${id}?status=saved`);
});

export const deletePost = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const { error } = await supabase.from("posts").delete().eq("id", String(fd.get("id")));
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
});
