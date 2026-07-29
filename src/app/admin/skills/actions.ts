"use server";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { skillSchema } from "@/lib/schemas";
import { formDataToRecord, requireUser, revalidateSite, withAdminAction } from "@/lib/admin/action-utils";
import { nextSort } from "@/lib/admin/sortable";

const PATH = "/admin/skills";

export const createSkill = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const parsed = skillSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);
  const sort = await nextSort(supabase, "skills");
  const { error } = await supabase.from("skills").insert({ ...parsed.data, sort });
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
});

export const deleteSkill = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await supabase.from("skills").delete().eq("id", String(fd.get("id")));
  revalidateSite();
  redirect(`${PATH}?status=saved`);
});
