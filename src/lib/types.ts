export type Locale = "en" | "no";

export interface ProfileRow {
  id: number;
  name: string;
  headline_en: string;
  headline_no: string;
  about_md_en: string;
  about_md_no: string;
  avatar_url: string | null;
  email: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  updated_at: string;
}

export interface ExperienceRow {
  id: string;
  company: string;
  role_en: string;
  role_no: string;
  period: string;
  description_md_en: string;
  description_md_no: string;
  sort: number;
}

export interface EducationRow {
  id: string;
  school: string;
  degree_en: string;
  degree_no: string;
  period: string;
  sort: number;
}

export interface SkillRow {
  id: string;
  name: string;
  category: string;
  sort: number;
}

export interface CertificationRow {
  id: string;
  name: string;
  issuer: string;
  date: string;
  badge_image_url: string | null;
  credential_url: string | null;
  pinned: boolean;
  sort: number;
}

export interface ProjectRow {
  id: string;
  title_en: string;
  title_no: string;
  summary_en: string;
  summary_no: string;
  description_md_en: string;
  description_md_no: string;
  image_url: string | null;
  tech_tags: string[];
  repo_url: string | null;
  live_url: string | null;
  featured: boolean;
  sort: number;
}

export interface PostRow {
  id: string;
  slug: string;
  title_en: string | null;
  title_no: string | null;
  body_md_en: string | null;
  body_md_no: string | null;
  cover_image_url: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
}
