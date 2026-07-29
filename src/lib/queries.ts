import { supabaseStatic } from "@/lib/supabase/static";
import type {
  CertificationRow, EducationRow, ExperienceRow, PostRow, ProfileRow, ProjectRow, SkillRow,
} from "@/lib/types";

export async function getProfile(): Promise<ProfileRow | null> {
  const { data } = await supabaseStatic().from("profile").select("*").eq("id", 1).maybeSingle();
  return data;
}

export async function getExperience(): Promise<ExperienceRow[]> {
  const { data } = await supabaseStatic().from("experience").select("*").order("sort");
  return data ?? [];
}

export async function getEducation(): Promise<EducationRow[]> {
  const { data } = await supabaseStatic().from("education").select("*").order("sort");
  return data ?? [];
}

export async function getSkills(): Promise<SkillRow[]> {
  const { data } = await supabaseStatic().from("skills").select("*").order("category").order("sort");
  return data ?? [];
}

export async function getCertifications(): Promise<CertificationRow[]> {
  const { data } = await supabaseStatic().from("certifications").select("*").order("sort");
  return data ?? [];
}

export async function getProjects(): Promise<ProjectRow[]> {
  const { data } = await supabaseStatic().from("projects").select("*").order("sort");
  return data ?? [];
}

export async function getPublishedPosts(): Promise<PostRow[]> {
  const { data } = await supabaseStatic()
    .from("posts").select("*").eq("published", true)
    .order("published_at", { ascending: false });
  return data ?? [];
}

export async function getPostBySlug(slug: string): Promise<PostRow | null> {
  const { data } = await supabaseStatic()
    .from("posts").select("*").eq("slug", slug).eq("published", true).maybeSingle();
  return data;
}
