import { createSupabaseServer } from "@/lib/supabase/server";
import { TextField, TextArea, LangPair } from "@/components/admin/fields";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { StatusBanner } from "@/components/admin/StatusBanner";
import { createExperience, updateExperience, deleteExperience, moveExperience } from "./actions";
import type { ExperienceRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function ExperienceFields({ row }: { row?: ExperienceRow }) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="company" label="Company" defaultValue={row?.company} required />
        <TextField name="period" label="Period (e.g. 2023 – now)" defaultValue={row?.period} />
      </div>
      <LangPair>
        <TextField name="role_en" label="Role" defaultValue={row?.role_en} />
        <TextField name="role_no" label="Rolle" defaultValue={row?.role_no} />
      </LangPair>
      <LangPair>
        <TextArea name="description_md_en" label="Description (md)" defaultValue={row?.description_md_en} rows={4} />
        <TextArea name="description_md_no" label="Beskrivelse (md)" defaultValue={row?.description_md_no} rows={4} />
      </LangPair>
    </>
  );
}

export default async function ExperienceAdmin({ searchParams }: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("experience").select("*").order("sort");
  const rows = (data ?? []) as ExperienceRow[];

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Experience</h1>
      <StatusBanner status={status} />
      <details className="mb-8 rounded-2xl border border-neutral-200 bg-white p-5" open={rows.length === 0}>
        <summary className="cursor-pointer font-medium text-primary">Add new</summary>
        <form action={createExperience} className="mt-4 flex flex-col gap-4">
          <ExperienceFields />
          <button className="self-start rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white">Add</button>
        </form>
      </details>
      <div className="flex flex-col gap-6">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
            <form action={updateExperience} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={row.id} />
              <ExperienceFields row={row} />
              <button className="self-start rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white">Save</button>
            </form>
            <div className="mt-3 flex items-center gap-4 border-t border-neutral-100 pt-3">
              <form action={moveExperience}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="direction" value="up" />
                <button className="text-sm text-neutral-500 hover:text-primary">↑ Up</button>
              </form>
              <form action={moveExperience}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="direction" value="down" />
                <button className="text-sm text-neutral-500 hover:text-primary">↓ Down</button>
              </form>
              <ConfirmDelete action={deleteExperience} id={row.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
