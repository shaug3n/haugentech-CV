import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { TextField } from "@/components/admin/fields";
import { PostEditForm } from "@/components/admin/PostEditForm";
import { PostLanguageTabs } from "@/components/admin/PostLanguageTabs";
import { StatusBanner } from "@/components/admin/StatusBanner";
import type { PostRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PostEdit({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status } = await searchParams;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  const p = data as PostRow | null;
  if (!p) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/admin/posts" className="text-sm text-primary hover:underline">← Posts</Link>
      <h1 className="mb-6 mt-2 text-2xl font-semibold">Edit post</h1>
      <StatusBanner status={status} />
      <PostEditForm>
        <input type="hidden" name="id" value={p.id} />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="slug" label="Slug" defaultValue={p.slug} required />
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" name="published" defaultChecked={p.published} />
            <span className="font-medium">Published</span>
          </label>
        </div>
        <PostLanguageTabs
          titleEn={p.title_en}
          bodyMdEn={p.body_md_en}
          titleNo={p.title_no}
          bodyMdNo={p.body_md_no}
        />
        <label className="block text-sm">
          <span className="font-medium">Cover image</span>
          <input type="file" name="cover" accept="image/*" className="mt-1 block text-sm" />
        </label>
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview; avoids remote-pattern config for owner-only cover thumbnail */}
        {p.cover_image_url && <img src={p.cover_image_url} alt="" className="h-32 rounded-lg object-cover" />}
      </PostEditForm>
    </div>
  );
}
