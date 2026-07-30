import { z } from "zod";

const trimToNull = (v: string | undefined) => (v && v.trim() !== "" ? v.trim() : null);

const optional = z.string().optional().transform(trimToNull);
const text = z.string().optional().transform((v) => v ?? "");

/**
 * An optional link. Every field using this is rendered straight into an
 * `href=` on a statically generated public page, where the browser will happily
 * execute a `javascript:` (or `data:`) URL on click — `marked`'s sanitizer
 * never sees these values because they never pass through markdown. So the
 * scheme is pinned here, at the only point where the value enters the database.
 */
const optionalUrl = z
  .string()
  .optional()
  .transform(trimToNull)
  .refine((v) => v === null || /^https?:\/\//i.test(v), {
    message: 'Enter a full URL starting with http:// or https:// (for example "https://example.com").',
  });

/** An optional email address, empty-string-becomes-null preserved. */
const optionalEmail = z
  .string()
  .optional()
  .transform(trimToNull)
  .refine((v) => v === null || z.string().email().safeParse(v).success, {
    message: 'Enter a valid email address (for example "you@example.com").',
  });
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
  email: optionalEmail,
  linkedin_url: optionalUrl,
  github_url: optionalUrl,
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
  credential_url: optionalUrl,
});

export const projectSchema = z.object({
  title_en: text,
  title_no: text,
  summary_en: text,
  summary_no: text,
  description_md_en: text,
  description_md_no: text,
  tech_tags: tags,
  repo_url: optionalUrl,
  live_url: optionalUrl,
  featured: checkbox,
});

/** A post is displayable in a language only if it has BOTH a title and a body there. */
function hasCompleteLanguage(v: {
  title_en: string | null; body_md_en: string | null;
  title_no: string | null; body_md_no: string | null;
}): boolean {
  return Boolean(v.title_en && v.body_md_en) || Boolean(v.title_no && v.body_md_no);
}

export const postSchema = z
  .object({
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
  })
  // Publish guard. `getPublishedPosts()` filters on `published` alone, so a post
  // ticked published with nothing in either language renders an empty card on
  // /blog whose link then 404s (the post page calls notFound() when the
  // localized title or body is missing). Blocking it here means drafts can still
  // be saved half-finished — only the published flag needs real content. Mirrors
  // `postAvailableIn()` in src/lib/localize.ts.
  .refine((v) => !v.published || hasCompleteLanguage(v), {
    message: "A post needs both a title and body in at least one language before it can be published.",
    path: ["published"],
  });
