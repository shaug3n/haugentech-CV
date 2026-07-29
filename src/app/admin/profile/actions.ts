"use server";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/schemas";
import { formDataToRecord, requireUser, revalidateSite, uploadImage } from "@/lib/admin/action-utils";

export async function saveProfile(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);

  const parsed = profileSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect("/admin/profile?status=error");

  const update: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };

  const avatar = fd.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    update.avatar_url = await uploadImage(supabase, avatar, "avatar");
  }

  const { error } = await supabase.from("profile").update(update).eq("id", 1);
  if (error) redirect("/admin/profile?status=error");

  revalidateSite();
  redirect("/admin/profile?status=saved");
}
