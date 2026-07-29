"use server";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { projectSchema } from "@/lib/schemas";
import { formDataToRecord, requireUser, revalidateSite, uploadImage, withAdminAction } from "@/lib/admin/action-utils";
import { moveItem, nextSort } from "@/lib/admin/sortable";

const PATH = "/admin/projects";

export const createProject = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const parsed = projectSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);
  const sort = await nextSort(supabase, "projects");

  const insert: Record<string, unknown> = { ...parsed.data, sort };
  const image = fd.get("image");
  if (image instanceof File && image.size > 0) {
    insert.image_url = await uploadImage(supabase, image, "projects");
  }

  const { error } = await supabase.from("projects").insert(insert);
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
});

export const updateProject = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const id = String(fd.get("id"));
  const parsed = projectSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);

  const update: Record<string, unknown> = { ...parsed.data };
  const image = fd.get("image");
  if (image instanceof File && image.size > 0) {
    update.image_url = await uploadImage(supabase, image, "projects");
  }

  const { error } = await supabase.from("projects").update(update).eq("id", id);
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
});

export const deleteProject = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await supabase.from("projects").delete().eq("id", String(fd.get("id")));
  revalidateSite();
  redirect(`${PATH}?status=saved`);
});

export const moveProject = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await moveItem(supabase, "projects", String(fd.get("id")), fd.get("direction") === "up" ? "up" : "down");
  revalidateSite();
  redirect(PATH);
});
