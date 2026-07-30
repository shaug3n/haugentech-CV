"use server";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/schemas";
import { formDataToRecord, requireUser, revalidateSite, uploadImage, withAdminAction } from "@/lib/admin/action-utils";

export const saveProfile = withAdminAction("/admin/profile?status=error", async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);

  const parsed = profileSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect("/admin/profile?status=error");

  const update: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };

  const avatar = fd.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    update.avatar_url = await uploadImage(supabase, avatar, "avatar");
  }

  // `.select("id")` makes PostgREST return the rows actually affected. RLS's
  // `USING` clause is a row filter, not a raising check: if the owner check
  // in `is_site_owner()` ever fails to match (e.g. `ADMIN_EMAIL` drifts from
  // the email hardcoded in the migration), this update silently touches zero
  // rows instead of erroring — checking `data.length` catches that case too.
  const { data, error } = await supabase.from("profile").update(update).eq("id", 1).select("id");
  if (error || !data?.length) redirect("/admin/profile?status=error");

  revalidateSite();
  redirect("/admin/profile?status=saved");
});
