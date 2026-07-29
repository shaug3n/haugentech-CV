"use server";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { experienceSchema } from "@/lib/schemas";
import { formDataToRecord, requireUser, revalidateSite, withAdminAction } from "@/lib/admin/action-utils";
import { moveItem, nextSort } from "@/lib/admin/sortable";

const PATH = "/admin/experience";

export const createExperience = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const parsed = experienceSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);
  const sort = await nextSort(supabase, "experience");
  const { error } = await supabase.from("experience").insert({ ...parsed.data, sort });
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
});

export const updateExperience = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const id = String(fd.get("id"));
  const parsed = experienceSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);
  const { error } = await supabase.from("experience").update(parsed.data).eq("id", id);
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
});

export const deleteExperience = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await supabase.from("experience").delete().eq("id", String(fd.get("id")));
  revalidateSite();
  redirect(`${PATH}?status=saved`);
});

export const moveExperience = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await moveItem(supabase, "experience", String(fd.get("id")), fd.get("direction") === "up" ? "up" : "down");
  revalidateSite();
  redirect(PATH);
});
