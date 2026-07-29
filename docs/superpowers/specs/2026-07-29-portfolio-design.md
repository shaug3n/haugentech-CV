# HaugenTech Portfolio — Design Spec

**Date:** 2026-07-29
**Status:** Approved by user
**Repo:** https://github.com/shaug3n/haugentech-CV.git
**Hosting:** Vercel

## Goal

A personal portfolio and career landing page for Sondre Haugen. Modern, minimal, tile/card-based design with subtle animations. Blue accent color. Bilingual (English default, Norwegian). Content managed through a custom admin panel backed by Supabase.

Design inspiration: https://www.abhayrana.com/#hero — but cleaner.

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15, App Router, TypeScript |
| Styling | Tailwind CSS 4 |
| Animations | Framer Motion |
| i18n | next-intl (`/en` default, `/no`) |
| Theme | next-themes (dark + light, follows system, manual toggle) |
| Database | Supabase Postgres |
| Auth | Supabase Auth (single admin user, email + password) |
| File storage | Supabase Storage (cert badges, project images, blog covers) |
| Markdown rendering | Markdown → HTML with `shiki` code highlighting |
| Validation | zod |
| Tests | Vitest |

## Architecture

```
Next.js 15 (App Router, TypeScript)
├─ Public site: /[locale] (en|no) — static, ISR with on-demand revalidation
│   ├─ /            one-pager: hero → about → CV → certs → projects → contact/footer
│   └─ /blog, /blog/[slug]
├─ Admin: /admin — client-rendered, Supabase auth guard (middleware)
│   └─ CRUD for all content, NO/EN fields side by side
└─ Supabase
    ├─ Postgres — content tables (RLS: public read, authenticated write)
    ├─ Auth — single admin user, created manually in Supabase dashboard (no signup flow)
    └─ Storage — public bucket for images
```

- Public pages are pre-rendered. Admin saves call `revalidatePath` on affected routes, so changes go live within seconds while visitors always hit static pages. No database reads per visitor request.
- Admin routes are protected by Supabase session middleware. Row Level Security enforces public read / authenticated write at the database level too.

## Data model

Language-split columns use the suffix pattern `_en` / `_no` (e.g. `title_en`, `title_no`).

| Table | Columns (besides id, timestamps) |
|---|---|
| `profile` (single row) | name, headline ×2 lang, about_md ×2 lang, avatar_url, social links (email, linkedin, github) |
| `experience` | company, role ×2 lang, period, description_md ×2 lang, sort |
| `education` | school, degree ×2 lang, period, sort |
| `skills` | name, category, sort |
| `certifications` | name, issuer, date, badge_image_url, credential_url, sort |
| `projects` | title ×2 lang, summary ×2 lang, description_md ×2 lang, image_url, tech_tags[], repo_url, live_url, featured, sort |
| `posts` | slug, title_en, title_no, body_md_en, body_md_no, cover_image_url, published, published_at — title/body columns nullable; a post is available in a language when that language's title and body are set |

Blog translation is optional: a post may exist in one language only. When a post lacks the visitor's language, it renders in its original language with a small "English only" / "Kun norsk" tag.

## Public site UI

- **Hero:** name, headline, short intro, avatar, social icons, scroll hint. Clean typography, generous whitespace, subtle blue gradient accent.
- **About:** short markdown bio in a card.
- **CV:** vertical timeline with cards per work role and education entry. Skills shown as tag chips grouped by category.
- **Certifications:** responsive grid of badge cards — badge image, name, issuer, date, link to credential. Hover lift.
- **Projects:** card grid; featured projects render larger. Each card: image, title, summary, tech tags, repo/live links.
- **Blog:** card list at `/blog`; post page renders markdown with `shiki` code highlighting and reading time.
- **Nav:** sticky top bar with anchor links, language toggle (EN/NO), theme toggle. Hamburger on mobile.
- **Contact:** links only — email link plus LinkedIn/GitHub icons in footer/contact section. No contact form.
- **Animations:** fade-up on scroll (triggered once), card hover lift/shadow, smooth anchor scrolling. Respects `prefers-reduced-motion`. Nothing more — deliberately minimal.
- **Color:** blue primary (`#2563eb` family), neutral grays; palette works in both dark and light themes.
- UI labels (nav, buttons, section headings) live in next-intl JSON message files; all content comes from the database.

## Admin panel

- `/admin/login` — Supabase email + password. No signup flow; the single admin user is created once in the Supabase dashboard.
- Dashboard sections: Profile, Experience, Education, Skills, Certifications, Projects, Posts.
- List views support reordering (updates `sort`), edit, and delete with confirmation.
- Edit forms show NO/EN fields side by side. Long-text fields use a markdown textarea with live preview. Images upload to Supabase Storage.
- Posts: markdown editor with preview, publish toggle, per-language tabs where either language is optional.
- Save flow: form → API route (zod validation) → database write → `revalidatePath` for affected pages → toast confirmation.
- Plain, functional Tailwind UI — no design effort spent here.

## Error handling

- Public: sections with no content are hidden entirely (e.g. no certifications → no cert section). Localized 404 page.
- Admin: zod form validation with inline errors; toasts for save success/failure.

## Testing

Vitest unit tests for data mapping, zod validation schemas, and i18n helpers. No end-to-end tests — solo-maintained portfolio, not worth the overhead.

## Deployment

- GitHub repo `shaug3n/haugentech-CV` → Vercel auto-deploy on push to `main`.
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- Supabase project created by the user (free tier). SQL migrations and RLS policies ship in the repo.

## Decisions log

- Content store: Supabase (database) over git-based CMS or headless CMS.
- i18n: URL-prefixed locales, English default.
- Blog: optional translation per post; markdown editor (no WYSIWYG).
- Layout: one-pager + separate blog pages.
- CV extras: skills/tech tags. No PDF download.
- Contact: links only, no form.
- Theme: dark + light with system auto-detect.
