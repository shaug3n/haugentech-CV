"use server";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { educationSchema } from "@/lib/schemas";
import { formDataToRecord, requireUser, revalidateSite, withAdminAction } from "@/lib/admin/action-utils";
import { moveItem, nextSort } from "@/lib/admin/sortable";

const PATH = "/admin/education";

export const createEducation = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const parsed = educationSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);
  const sort = await nextSort(supabase, "education");
  const { error } = await supabase.from("education").insert({ ...parsed.data, sort });
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
});

export const updateEducation = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const id = String(fd.get("id"));
  const parsed = educationSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);
  const { error } = await supabase.from("education").update(parsed.data).eq("id", id);
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
});

export const deleteEducation = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await supabase.from("education").delete().eq("id", String(fd.get("id")));
  revalidateSite();
  redirect(`${PATH}?status=saved`);
});

export const moveEducation = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await moveItem(supabase, "education", String(fd.get("id")), fd.get("direction") === "up" ? "up" : "down");
  revalidateSite();
  redirect(PATH);
});
