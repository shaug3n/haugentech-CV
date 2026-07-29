"use server";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { postSchema } from "@/lib/schemas";
import { formDataToRecord, requireUser, revalidateSite, uploadImage, withAdminAction } from "@/lib/admin/action-utils";

const PATH = "/admin/posts";

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
  if (error || !data) redirect(`${PATH}?status=error`);
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
    const { data: existing } = await supabase.from("posts").select("published_at").eq("id", id).single();
    if (!existing?.published_at) update.published_at = new Date().toISOString();
  }

  const { error } = await supabase.from("posts").update(update).eq("id", id);
  if (error) redirect(`${PATH}/${id}?status=error`);
  revalidateSite();
  redirect(`${PATH}/${id}?status=saved`);
});

export const deletePost = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await supabase.from("posts").delete().eq("id", String(fd.get("id")));
  revalidateSite();
  redirect(`${PATH}?status=saved`);
});
