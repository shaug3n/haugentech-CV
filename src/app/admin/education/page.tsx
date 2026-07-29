import { createSupabaseServer } from "@/lib/supabase/server";
import { TextField, LangPair } from "@/components/admin/fields";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { StatusBanner } from "@/components/admin/StatusBanner";
import { createEducation, updateEducation, deleteEducation, moveEducation } from "./actions";
import type { EducationRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function EducationFields({ row }: { row?: EducationRow }) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="school" label="School" defaultValue={row?.school} required />
        <TextField name="period" label="Period" defaultValue={row?.period} />
      </div>
      <LangPair>
        <TextField name="degree_en" label="Degree" defaultValue={row?.degree_en} />
        <TextField name="degree_no" label="Grad" defaultValue={row?.degree_no} />
      </LangPair>
    </>
  );
}

export default async function EducationAdmin({ searchParams }: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("education").select("*").order("sort");
  const rows = (data ?? []) as EducationRow[];

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Education</h1>
      <StatusBanner status={status} />
      <details className="mb-8 rounded-2xl border border-neutral-200 bg-white p-5" open={rows.length === 0}>
        <summary className="cursor-pointer font-medium text-primary">Add new</summary>
        <form action={createEducation} className="mt-4 flex flex-col gap-4">
          <EducationFields />
          <button className="self-start rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white">Add</button>
        </form>
      </details>
      <div className="flex flex-col gap-6">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
            <form action={updateEducation} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={row.id} />
              <EducationFields row={row} />
              <button className="self-start rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white">Save</button>
            </form>
            <div className="mt-3 flex items-center gap-4 border-t border-neutral-100 pt-3">
              <form action={moveEducation}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="direction" value="up" />
                <button className="text-sm text-neutral-500 hover:text-primary">↑ Up</button>
              </form>
              <form action={moveEducation}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="direction" value="down" />
                <button className="text-sm text-neutral-500 hover:text-primary">↓ Down</button>
              </form>
              <ConfirmDelete action={deleteEducation} id={row.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
