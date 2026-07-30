import { createSupabaseServer } from "@/lib/supabase/server";
import { TextField } from "@/components/admin/fields";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { StatusBanner } from "@/components/admin/StatusBanner";
import { createSkill, deleteSkill } from "./actions";
import type { SkillRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SkillsAdmin({ searchParams }: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("skills").select("*").order("category").order("sort");
  const rows = (data ?? []) as SkillRow[];

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Skills</h1>
      <StatusBanner status={status} />
      <form action={createSkill} className="mb-8 flex items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
        <TextField name="name" label="Skill" required />
        <TextField name="category" label="Category" required />
        <button className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white">Add</button>
      </form>
      <div className="flex flex-col gap-2">
        {rows.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-2">
            <span className="text-sm"><strong>{s.name}</strong> <span className="text-neutral-400">· {s.category}</span></span>
            <ConfirmDelete action={deleteSkill} id={s.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
