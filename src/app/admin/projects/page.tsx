import { createSupabaseServer } from "@/lib/supabase/server";
import { TextField, TextArea, LangPair } from "@/components/admin/fields";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { StatusBanner } from "@/components/admin/StatusBanner";
import { createProject, updateProject, deleteProject, moveProject } from "./actions";
import type { ProjectRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function ProjectFields({ row }: { row?: ProjectRow }) {
  return (
    <>
      <LangPair>
        <TextField name="title_en" label="Title" defaultValue={row?.title_en} />
        <TextField name="title_no" label="Tittel" defaultValue={row?.title_no} />
      </LangPair>
      <LangPair>
        <TextField name="summary_en" label="Summary" defaultValue={row?.summary_en} />
        <TextField name="summary_no" label="Sammendrag" defaultValue={row?.summary_no} />
      </LangPair>
      <LangPair>
        <TextArea name="description_md_en" label="Description (md)" defaultValue={row?.description_md_en} rows={4} />
        <TextArea name="description_md_no" label="Beskrivelse (md)" defaultValue={row?.description_md_no} rows={4} />
      </LangPair>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="tech_tags" label="Tech tags (comma-separated)" defaultValue={row?.tech_tags.join(", ")} />
        <TextField name="repo_url" label="Repo URL" defaultValue={row?.repo_url} />
        <TextField name="live_url" label="Live URL" defaultValue={row?.live_url} />
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" name="featured" defaultChecked={row?.featured} />
          <span className="font-medium">Featured (wide card)</span>
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium">Image</span>
        <input type="file" name="image" accept="image/*" className="mt-1 block text-sm" />
      </label>
      {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview; avoids remote-pattern config for owner-only project thumbnail */}
      {row?.image_url && <img src={row.image_url} alt="" className="h-24 rounded-lg object-cover" />}
    </>
  );
}

export default async function ProjectsAdmin({ searchParams }: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("projects").select("*").order("sort");
  const rows = (data ?? []) as ProjectRow[];

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Projects</h1>
      <StatusBanner status={status} />
      <details className="mb-8 rounded-2xl border border-neutral-200 bg-white p-5" open={rows.length === 0}>
        <summary className="cursor-pointer font-medium text-primary">Add new</summary>
        <form action={createProject} className="mt-4 flex flex-col gap-4">
          <ProjectFields />
          <button className="self-start rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white">Add</button>
        </form>
      </details>
      <div className="flex flex-col gap-6">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
            <form action={updateProject} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={row.id} />
              <ProjectFields row={row} />
              <button className="self-start rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white">Save</button>
            </form>
            <div className="mt-3 flex items-center gap-4 border-t border-neutral-100 pt-3">
              <form action={moveProject}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="direction" value="up" />
                <button className="text-sm text-neutral-500 hover:text-primary">↑ Up</button>
              </form>
              <form action={moveProject}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="direction" value="down" />
                <button className="text-sm text-neutral-500 hover:text-primary">↓ Down</button>
              </form>
              <ConfirmDelete action={deleteProject} id={row.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
