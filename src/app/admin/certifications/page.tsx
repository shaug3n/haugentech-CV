import { createSupabaseServer } from "@/lib/supabase/server";
import { TextField } from "@/components/admin/fields";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { StatusBanner } from "@/components/admin/StatusBanner";
import { createCertification, updateCertification, deleteCertification, moveCertification } from "./actions";
import type { CertificationRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function CertFields({ row }: { row?: CertificationRow }) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="name" label="Name" defaultValue={row?.name} required />
        <TextField name="issuer" label="Issuer" defaultValue={row?.issuer} />
        <TextField name="date" label="Date (e.g. 2025-03)" defaultValue={row?.date} />
        <TextField name="credential_url" label="Credential URL" defaultValue={row?.credential_url} />
      </div>
      <label className="block text-sm">
        <span className="font-medium">Badge image</span>
        <input type="file" name="badge" accept="image/*" className="mt-1 block text-sm" />
      </label>
      {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview; avoids remote-pattern config for owner-only badge thumbnail */}
      {row?.badge_image_url && <img src={row.badge_image_url} alt="" className="h-16 w-16 object-contain" />}
    </>
  );
}

export default async function CertificationsAdmin({ searchParams }: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("certifications").select("*").order("sort");
  const rows = (data ?? []) as CertificationRow[];

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Certifications</h1>
      <StatusBanner status={status} />
      <details className="mb-8 rounded-2xl border border-neutral-200 bg-white p-5" open={rows.length === 0}>
        <summary className="cursor-pointer font-medium text-primary">Add new</summary>
        <form action={createCertification} className="mt-4 flex flex-col gap-4">
          <CertFields />
          <button className="self-start rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white">Add</button>
        </form>
      </details>
      <div className="flex flex-col gap-6">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
            <form action={updateCertification} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={row.id} />
              <CertFields row={row} />
              <button className="self-start rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white">Save</button>
            </form>
            <div className="mt-3 flex items-center gap-4 border-t border-neutral-100 pt-3">
              <form action={moveCertification}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="direction" value="up" />
                <button className="text-sm text-neutral-500 hover:text-primary">↑ Up</button>
              </form>
              <form action={moveCertification}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="direction" value="down" />
                <button className="text-sm text-neutral-500 hover:text-primary">↓ Down</button>
              </form>
              <ConfirmDelete action={deleteCertification} id={row.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
