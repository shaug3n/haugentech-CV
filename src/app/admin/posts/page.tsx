import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { TextField } from "@/components/admin/fields";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { StatusBanner } from "@/components/admin/StatusBanner";
import { createPost, deletePost } from "./actions";
import type { PostRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PostsAdmin({ searchParams }: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
  const rows = (data ?? []) as PostRow[];

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Posts</h1>
      <StatusBanner status={status} />
      <form action={createPost} className="mb-8 flex items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
        <TextField name="slug" label="Slug for new post" required />
        <button className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white">Create draft</button>
      </form>
      <div className="flex flex-col gap-2">
        {rows.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3">
            <div>
              <Link href={`/admin/posts/${p.id}`} className="font-medium text-primary hover:underline">
                {p.title_en || p.title_no || p.slug}
              </Link>
              <p className="text-xs text-neutral-400">
                /{p.slug} · {p.published ? "published" : "draft"}
                {" · "}
                {[p.title_en && "EN", p.title_no && "NO"].filter(Boolean).join(", ") || "no content"}
              </p>
            </div>
            <ConfirmDelete action={deletePost} id={p.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
