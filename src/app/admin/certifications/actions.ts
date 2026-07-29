"use server";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { certificationSchema } from "@/lib/schemas";
import { formDataToRecord, requireUser, revalidateSite, uploadImage, withAdminAction } from "@/lib/admin/action-utils";
import { moveItem, nextSort } from "@/lib/admin/sortable";

const PATH = "/admin/certifications";

export const createCertification = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const parsed = certificationSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);
  const sort = await nextSort(supabase, "certifications");

  const insert: Record<string, unknown> = { ...parsed.data, sort };
  const badge = fd.get("badge");
  if (badge instanceof File && badge.size > 0) {
    insert.badge_image_url = await uploadImage(supabase, badge, "certs");
  }

  const { error } = await supabase.from("certifications").insert(insert);
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
});

export const updateCertification = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const id = String(fd.get("id"));
  const parsed = certificationSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);

  const update: Record<string, unknown> = { ...parsed.data };
  const badge = fd.get("badge");
  if (badge instanceof File && badge.size > 0) {
    update.badge_image_url = await uploadImage(supabase, badge, "certs");
  }

  const { error } = await supabase.from("certifications").update(update).eq("id", id);
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
});

export const deleteCertification = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await supabase.from("certifications").delete().eq("id", String(fd.get("id")));
  revalidateSite();
  redirect(`${PATH}?status=saved`);
});

export const moveCertification = withAdminAction(`${PATH}?status=error`, async (fd: FormData) => {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await moveItem(supabase, "certifications", String(fd.get("id")), fd.get("direction") === "up" ? "up" : "down");
  revalidateSite();
  redirect(PATH);
});
