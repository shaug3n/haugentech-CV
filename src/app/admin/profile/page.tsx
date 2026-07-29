import { createSupabaseServer } from "@/lib/supabase/server";
import { TextField, TextArea, LangPair } from "@/components/admin/fields";
import { StatusBanner } from "@/components/admin/StatusBanner";
import { saveProfile } from "./actions";
import type { ProfileRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProfileAdmin({ searchParams }: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("profile").select("*").eq("id", 1).maybeSingle();
  const p = data as ProfileRow | null;

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Profile</h1>
      <StatusBanner status={status} />
      <form action={saveProfile} className="flex flex-col gap-4">
        <TextField name="name" label="Name" defaultValue={p?.name} required />
        <LangPair>
          <TextField name="headline_en" label="Headline" defaultValue={p?.headline_en} />
          <TextField name="headline_no" label="Headline" defaultValue={p?.headline_no} />
        </LangPair>
        <LangPair>
          <TextArea name="about_md_en" label="About (markdown)" defaultValue={p?.about_md_en} rows={10} />
          <TextArea name="about_md_no" label="About (markdown)" defaultValue={p?.about_md_no} rows={10} />
        </LangPair>
        <TextField name="email" label="Email" defaultValue={p?.email} />
        <TextField name="linkedin_url" label="LinkedIn URL" defaultValue={p?.linkedin_url} />
        <TextField name="github_url" label="GitHub URL" defaultValue={p?.github_url} />
        <label className="block text-sm">
          <span className="font-medium">Avatar (upload replaces current)</span>
          <input type="file" name="avatar" accept="image/*" className="mt-1 block text-sm" />
        </label>
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview; avoids remote-pattern config for owner-only avatar thumbnail */}
        {p?.avatar_url && <img src={p.avatar_url} alt="avatar" className="h-24 w-24 rounded-xl object-cover" />}
        <button className="self-start rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white">
          Save
        </button>
      </form>
    </div>
  );
}
