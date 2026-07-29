import { supabaseStatic } from "@/lib/supabase/static";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  CertificationRow, EducationRow, ExperienceRow, PostRow, ProfileRow, ProjectRow, SkillRow,
} from "@/lib/types";

// Shared "degrade gracefully" guard: when Supabase isn't configured (or the
// client can't be constructed), skip the network call entirely and hand back
// the same shape a query with no results would produce. This keeps every
// exported query function throw-free without repeating the null-check in
// each of the eight bodies below.

async function queryOne<T>(
  run: (client: SupabaseClient) => PromiseLike<{ data: T | null }>,
): Promise<T | null> {
  const client = supabaseStatic();
  if (!client) return null;
  const { data } = await run(client);
  return data ?? null;
}

async function queryMany<T>(
  run: (client: SupabaseClient) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const client = supabaseStatic();
  if (!client) return [];
  const { data } = await run(client);
  return data ?? [];
}

export function getProfile(): Promise<ProfileRow | null> {
  return queryOne<ProfileRow>((client) =>
    client.from("profile").select("*").eq("id", 1).maybeSingle(),
  );
}

export function getExperience(): Promise<ExperienceRow[]> {
  return queryMany<ExperienceRow>((client) =>
    client.from("experience").select("*").order("sort"),
  );
}

export function getEducation(): Promise<EducationRow[]> {
  return queryMany<EducationRow>((client) =>
    client.from("education").select("*").order("sort"),
  );
}

export function getSkills(): Promise<SkillRow[]> {
  return queryMany<SkillRow>((client) =>
    client.from("skills").select("*").order("category").order("sort"),
  );
}

export function getCertifications(): Promise<CertificationRow[]> {
  return queryMany<CertificationRow>((client) =>
    client.from("certifications").select("*").order("sort"),
  );
}

export function getProjects(): Promise<ProjectRow[]> {
  return queryMany<ProjectRow>((client) =>
    client.from("projects").select("*").order("sort"),
  );
}

export function getPublishedPosts(): Promise<PostRow[]> {
  return queryMany<PostRow>((client) =>
    client
      .from("posts").select("*").eq("published", true)
      .order("published_at", { ascending: false }),
  );
}

export function getPostBySlug(slug: string): Promise<PostRow | null> {
  return queryOne<PostRow>((client) =>
    client.from("posts").select("*").eq("slug", slug).eq("published", true).maybeSingle(),
  );
}
