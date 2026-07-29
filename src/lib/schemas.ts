import { z } from "zod";

const optional = z.string().optional().transform((v) => (v && v.trim() !== "" ? v.trim() : null));
const text = z.string().optional().transform((v) => v ?? "");
const checkbox = z.string().optional().transform((v) => v === "on" || v === "true");
const tags = z.string().optional().transform((v) =>
  (v ?? "").split(",").map((s) => s.trim()).filter(Boolean),
);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[æå]/g, "a")
    .replace(/ø/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const profileSchema = z.object({
  name: z.string().min(1),
  headline_en: text,
  headline_no: text,
  about_md_en: text,
  about_md_no: text,
  email: optional,
  linkedin_url: optional,
  github_url: optional,
});

export const experienceSchema = z.object({
  company: z.string().min(1),
  role_en: text,
  role_no: text,
  period: text,
  description_md_en: text,
  description_md_no: text,
});

export const educationSchema = z.object({
  school: z.string().min(1),
  degree_en: text,
  degree_no: text,
  period: text,
});

export const skillSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
});

export const certificationSchema = z.object({
  name: z.string().min(1),
  issuer: text,
  date: text,
  credential_url: optional,
});

export const projectSchema = z.object({
  title_en: text,
  title_no: text,
  summary_en: text,
  summary_no: text,
  description_md_en: text,
  description_md_no: text,
  tech_tags: tags,
  repo_url: optional,
  live_url: optional,
  featured: checkbox,
});

export const postSchema = z.object({
  slug: z
    .string()
    .min(1)
    .transform(slugify)
    .refine((v) => v.length > 0, {
      message: "Slug must contain at least one letter or number (e.g. \"my-post-title\").",
    }),
  title_en: optional,
  title_no: optional,
  body_md_en: optional,
  body_md_no: optional,
  published: checkbox,
});
