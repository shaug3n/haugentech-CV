# HaugenTech Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bilingual (en/no) portfolio one-pager + blog with a Supabase-backed admin panel, deployed on Vercel.

**Architecture:** Next.js 15 App Router. Public pages under `/[locale]` are force-static with on-demand revalidation (`revalidatePath`) triggered by admin saves. Admin lives at `/admin` (outside locale routing), guarded by Supabase Auth middleware, writes via server actions with zod validation. Content in Supabase Postgres (RLS: public read, authenticated write), images in Supabase Storage.

**Tech Stack:** Next.js 15, TypeScript (strict), Tailwind CSS 4, next-intl 4, next-themes, framer-motion, @supabase/supabase-js + @supabase/ssr, zod, marked + shiki, Vitest.

## Global Constraints

- Locales: `en` (default), `no`. URL prefix always (`/en`, `/no`).
- Blue primary: `#2563eb` (tailwind `blue-600` family). Dark + light themes via `.dark` class.
- Language-split DB columns use `_en` / `_no` suffix.
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a `SUPABASE_SERVICE_ROLE_KEY` line ships commented in `.env.example` for future use; the app does not read it).
- Path alias `@/*` → `src/*`.
- Git remote: `https://github.com/shaug3n/haugentech-CV.git`, branch `main`.
- Animations: fade-up on scroll (once), hover lift, smooth anchor scroll. Must respect `prefers-reduced-motion`. Nothing else.
- Markdown is admin-authored only — no HTML sanitizer needed.
- All UI labels via next-intl messages; all content from DB.

---

### Task 1: Project scaffold + Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`, `.env.example`, `vitest.config.ts`
- Create: `src/app/layout.tsx`, `src/app/globals.css`
- Test: `tests/smoke.test.ts`

**Interfaces:**
- Produces: runnable Next.js app (`npm run dev`, `npm run build`), test runner (`npm test`), Tailwind 4 with theme tokens `--color-primary`, `.dark` variant.

- [ ] **Step 1: Write config files**

`package.json`:

```json
{
  "name": "haugentech-portfolio",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@supabase/ssr": "^0.6.1",
    "@supabase/supabase-js": "^2.49.0",
    "framer-motion": "^12.0.0",
    "marked": "^15.0.0",
    "next": "^15.3.0",
    "next-intl": "^4.0.0",
    "next-themes": "^0.4.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "shiki": "^3.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4.0.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.ts`:

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
};

export default withNextIntl(nextConfig);
```

`postcss.config.mjs`:

```js
export default {
  plugins: { "@tailwindcss/postcss": {} },
};
```

`.gitignore`:

```
node_modules
.next
out
.env*.local
.env
*.tsbuildinfo
next-env.d.ts
```

`.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
# Not read by the app today; reserved for future server-side jobs:
# SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

`vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

- [ ] **Step 2: Write minimal app shell**

`src/app/globals.css`:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-primary: #2563eb;
  --color-primary-soft: #3b82f6;
  --color-primary-faint: #dbeafe;
}

html {
  scroll-behavior: smooth;
}

@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}

section[id] {
  scroll-margin-top: 5rem;
}

.prose-md h1, .prose-md h2, .prose-md h3 { font-weight: 600; margin: 1.25em 0 0.5em; }
.prose-md h1 { font-size: 1.5rem; }
.prose-md h2 { font-size: 1.25rem; }
.prose-md h3 { font-size: 1.1rem; }
.prose-md p, .prose-md ul, .prose-md ol { margin: 0.75em 0; line-height: 1.7; }
.prose-md ul { list-style: disc; padding-left: 1.5em; }
.prose-md ol { list-style: decimal; padding-left: 1.5em; }
.prose-md a { color: var(--color-primary); text-decoration: underline; }
.prose-md pre { border-radius: 0.5rem; padding: 1rem; overflow-x: auto; margin: 1em 0; font-size: 0.875rem; }
.prose-md code { font-size: 0.9em; }
.prose-md blockquote { border-left: 3px solid var(--color-primary); padding-left: 1em; opacity: 0.85; }
.dark .prose-md pre.shiki, .dark .prose-md pre.shiki span { color: var(--shiki-dark) !important; background-color: var(--shiki-dark-bg) !important; }
```

`src/app/layout.tsx` (root passthrough — locale layout renders `<html>` later; for now render directly so the app builds):

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

Note: Next.js requires `<html>`/`<body>` somewhere; until Task 4 adds the locale layout, add a temporary page. Create `src/app/page.tsx`:

```tsx
export default function Placeholder() {
  return (
    <html lang="en">
      <body>
        <p>haugentech-portfolio scaffold</p>
      </body>
    </html>
  );
}
```

This placeholder is deleted in Task 4. Root layout returning `children` directly is the permanent shape (locale layout owns `<html>`).

- [ ] **Step 3: Write smoke test**

`tests/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("toolchain", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Install and verify**

Run: `npm install`
Run: `npm test` — Expected: 1 passed.
Run: `npm run build` — Expected: build succeeds (placeholder page warning about missing html in layout is acceptable only if build still passes; if build fails, keep the `<html>` wrapper inside `page.tsx` as written).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 + Tailwind 4 + Vitest"
```

---

### Task 2: Database schema, RLS, storage + Supabase clients

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `src/lib/supabase/static.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/client.ts`
- Create: `src/lib/types.ts`

**Interfaces:**
- Produces: `supabaseStatic()` (cookie-less anon client for static builds), `createSupabaseServer()` (cookie-bound server client, async), `createSupabaseBrowser()` (browser client). Row types: `ProfileRow`, `ExperienceRow`, `EducationRow`, `SkillRow`, `CertificationRow`, `ProjectRow`, `PostRow`.

- [ ] **Step 1: Write migration SQL**

`supabase/migrations/0001_init.sql`:

```sql
-- Content tables ------------------------------------------------------------
create table profile (
  id smallint primary key default 1 check (id = 1),
  name text not null default '',
  headline_en text not null default '',
  headline_no text not null default '',
  about_md_en text not null default '',
  about_md_no text not null default '',
  avatar_url text,
  email text,
  linkedin_url text,
  github_url text,
  updated_at timestamptz not null default now()
);
insert into profile (id) values (1);

create table experience (
  id uuid primary key default gen_random_uuid(),
  company text not null,
  role_en text not null default '',
  role_no text not null default '',
  period text not null default '',
  description_md_en text not null default '',
  description_md_no text not null default '',
  sort int not null default 0
);

create table education (
  id uuid primary key default gen_random_uuid(),
  school text not null,
  degree_en text not null default '',
  degree_no text not null default '',
  period text not null default '',
  sort int not null default 0
);

create table skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'General',
  sort int not null default 0
);

create table certifications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  issuer text not null default '',
  date text not null default '',
  badge_image_url text,
  credential_url text,
  sort int not null default 0
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  title_en text not null default '',
  title_no text not null default '',
  summary_en text not null default '',
  summary_no text not null default '',
  description_md_en text not null default '',
  description_md_no text not null default '',
  image_url text,
  tech_tags text[] not null default '{}',
  repo_url text,
  live_url text,
  featured boolean not null default false,
  sort int not null default 0
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_en text,
  title_no text,
  body_md_en text,
  body_md_no text,
  cover_image_url text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- RLS: public read, authenticated write --------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profile','experience','education','skills','certifications','projects','posts']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "public read" on %I for select using (true)', t);
    execute format('create policy "auth insert" on %I for insert to authenticated with check (true)', t);
    execute format('create policy "auth update" on %I for update to authenticated using (true)', t);
    execute format('create policy "auth delete" on %I for delete to authenticated using (true)', t);
  end loop;
end $$;

-- Storage: public media bucket ------------------------------------------------
insert into storage.buckets (id, name, public) values ('media', 'media', true);

create policy "media public read" on storage.objects
  for select using (bucket_id = 'media');
create policy "media auth write" on storage.objects
  for insert to authenticated with check (bucket_id = 'media');
create policy "media auth update" on storage.objects
  for update to authenticated using (bucket_id = 'media');
create policy "media auth delete" on storage.objects
  for delete to authenticated using (bucket_id = 'media');
```

- [ ] **Step 2: Write row types**

`src/lib/types.ts`:

```ts
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
```

- [ ] **Step 3: Write Supabase clients**

`src/lib/supabase/static.ts` (used by public pages at build/revalidate time — no cookies, anon read):

```ts
import { createClient } from "@supabase/supabase-js";

export function supabaseStatic() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

`src/lib/supabase/server.ts` (admin server actions/pages — session from cookies):

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from a Server Component — middleware refreshes sessions
          }
        },
      },
    },
  );
}
```

`src/lib/supabase/client.ts` (login page):

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build` — Expected: succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add database migration, row types, supabase clients"
```

---

### Task 3: Localization mapper + data queries (TDD)

**Files:**
- Create: `src/lib/localize.ts`, `src/lib/queries.ts`
- Test: `tests/localize.test.ts`

**Interfaces:**
- Consumes: row types from `@/lib/types`, `supabaseStatic()` from `@/lib/supabase/static`.
- Produces:
  - `localize<T extends Record<string, unknown>>(row: T, locale: Locale): Localized<T>` — strips `_en`/`_no` suffixed keys into unsuffixed keys for the locale, falling back to the other language when the value is `null` or `""`.
  - `postAvailableIn(post: PostRow, locale: Locale): boolean` — true when that locale's `title` and `body_md` are non-empty.
  - Queries (all use `supabaseStatic()`, all ordered by `sort` where applicable): `getProfile()`, `getExperience()`, `getEducation()`, `getSkills()`, `getCertifications()`, `getProjects()`, `getPublishedPosts()`, `getPostBySlug(slug: string)`.

- [ ] **Step 1: Write failing tests**

`tests/localize.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { localize, postAvailableIn } from "@/lib/localize";
import type { PostRow } from "@/lib/types";

describe("localize", () => {
  const row = {
    id: "x",
    company: "Acme",
    role_en: "Engineer",
    role_no: "Ingeniør",
    sort: 1,
  };

  it("picks locale-suffixed fields and keeps plain fields", () => {
    expect(localize(row, "no")).toEqual({
      id: "x",
      company: "Acme",
      role: "Ingeniør",
      sort: 1,
    });
  });

  it("picks english for en locale", () => {
    expect(localize(row, "en").role).toBe("Engineer");
  });

  it("falls back to other language when value empty", () => {
    const r = { title_en: "Hello", title_no: "" };
    expect(localize(r, "no").title).toBe("Hello");
  });

  it("falls back to other language when value null", () => {
    const r = { title_en: null, title_no: "Hei" };
    expect(localize(r, "en").title).toBe("Hei");
  });
});

const basePost: PostRow = {
  id: "1",
  slug: "s",
  title_en: "T",
  title_no: null,
  body_md_en: "B",
  body_md_no: null,
  cover_image_url: null,
  published: true,
  published_at: null,
  created_at: "2026-01-01",
};

describe("postAvailableIn", () => {
  it("true when title and body set", () => {
    expect(postAvailableIn(basePost, "en")).toBe(true);
  });
  it("false when body missing", () => {
    expect(postAvailableIn({ ...basePost, body_md_en: null }, "en")).toBe(false);
  });
  it("false when title empty string", () => {
    expect(postAvailableIn({ ...basePost, title_en: "" }, "en")).toBe(false);
  });
  it("false for untranslated locale", () => {
    expect(postAvailableIn(basePost, "no")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test` — Expected: FAIL, cannot resolve `@/lib/localize`.

- [ ] **Step 3: Implement**

`src/lib/localize.ts`:

```ts
import type { Locale, PostRow } from "@/lib/types";

type StripLang<K> = K extends `${infer Base}_en` ? Base : K extends `${infer B}_no` ? never : K;
export type Localized<T> = { [K in keyof T as StripLang<K>]: T[K] };

const OTHER: Record<Locale, Locale> = { en: "no", no: "en" };

export function localize<T extends Record<string, unknown>>(
  row: T,
  locale: Locale,
): Localized<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith("_en") || key.endsWith("_no")) {
      const base = key.slice(0, -3);
      const suffix = key.slice(-2) as Locale;
      if (suffix !== locale) continue;
      const fallback = row[`${base}_${OTHER[locale]}`];
      out[base] = value === null || value === "" ? (fallback ?? value) : value;
    } else {
      out[key] = value;
    }
  }
  return out as Localized<T>;
}

export function postAvailableIn(post: PostRow, locale: Locale): boolean {
  const title = locale === "en" ? post.title_en : post.title_no;
  const body = locale === "en" ? post.body_md_en : post.body_md_no;
  return Boolean(title) && Boolean(body);
}
```

`src/lib/queries.ts`:

```ts
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
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test` — Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: localization mapper and content queries"
```

---

### Task 4: i18n routing, messages, locale layout, theme

**Files:**
- Create: `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/i18n/navigation.ts`, `src/middleware.ts`
- Create: `messages/en.json`, `messages/no.json`
- Create: `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `src/app/[locale]/not-found.tsx`, `src/components/ThemeProvider.tsx`
- Delete: `src/app/page.tsx` (placeholder from Task 1)

**Interfaces:**
- Produces: `routing` (locales en/no, default en), `Link`/`usePathname`/`useRouter` from `@/i18n/navigation`, messages namespaces `nav`, `sections`, `blog`, `footer`, `notFound`. Locale layout renders `<html>` with `ThemeProvider` and `NextIntlClientProvider`. Placeholder home page (sections filled in Tasks 6–9).

- [ ] **Step 1: Write i18n plumbing**

`src/i18n/routing.ts`:

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "no"],
  defaultLocale: "en",
  localePrefix: "always",
});
```

`src/i18n/request.ts`:

```ts
import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

`src/i18n/navigation.ts`:

```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
```

`src/middleware.ts` (intl only — Supabase auth added in Task 12):

```ts
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|admin|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 2: Write messages**

`messages/en.json`:

```json
{
  "nav": {
    "about": "About",
    "cv": "CV",
    "certifications": "Certifications",
    "projects": "Projects",
    "blog": "Blog",
    "toggleTheme": "Toggle theme",
    "menu": "Menu"
  },
  "sections": {
    "about": "About me",
    "experience": "Experience",
    "education": "Education",
    "skills": "Skills",
    "certifications": "Certifications",
    "projects": "Projects",
    "viewCredential": "View credential",
    "sourceCode": "Source",
    "liveSite": "Live"
  },
  "blog": {
    "title": "Blog",
    "readingTime": "{minutes} min read",
    "untranslated": "English only",
    "empty": "No posts yet.",
    "back": "All posts"
  },
  "footer": {
    "contact": "Get in touch"
  },
  "notFound": {
    "title": "Page not found",
    "body": "That page does not exist.",
    "home": "Back home"
  }
}
```

`messages/no.json`:

```json
{
  "nav": {
    "about": "Om meg",
    "cv": "CV",
    "certifications": "Sertifiseringer",
    "projects": "Prosjekter",
    "blog": "Blogg",
    "toggleTheme": "Bytt tema",
    "menu": "Meny"
  },
  "sections": {
    "about": "Om meg",
    "experience": "Erfaring",
    "education": "Utdanning",
    "skills": "Ferdigheter",
    "certifications": "Sertifiseringer",
    "projects": "Prosjekter",
    "viewCredential": "Se sertifikat",
    "sourceCode": "Kildekode",
    "liveSite": "Live"
  },
  "blog": {
    "title": "Blogg",
    "readingTime": "{minutes} min lesetid",
    "untranslated": "Kun engelsk",
    "empty": "Ingen innlegg ennå.",
    "back": "Alle innlegg"
  },
  "footer": {
    "contact": "Ta kontakt"
  },
  "notFound": {
    "title": "Siden finnes ikke",
    "body": "Denne siden eksisterer ikke.",
    "home": "Til forsiden"
  }
}
```

- [ ] **Step 3: Write theme provider and locale layout**

`src/components/ThemeProvider.tsx`:

```tsx
"use client";
import { ThemeProvider as NextThemes } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemes>
  );
}
```

`src/app/[locale]/layout.tsx`:

```tsx
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/ThemeProvider";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata = {
  title: "Sondre Haugen — Portfolio",
  description: "Portfolio and blog of Sondre Haugen",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <ThemeProvider>
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

`src/app/[locale]/page.tsx` (placeholder home; sections arrive Tasks 6–9):

```tsx
import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-static";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <main className="mx-auto max-w-5xl px-4 py-20">Coming soon</main>;
}
```

`src/app/[locale]/not-found.tsx`:

```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="text-neutral-500">{t("body")}</p>
      <Link href="/" className="rounded-lg bg-primary px-4 py-2 text-white">
        {t("home")}
      </Link>
    </main>
  );
}
```

Delete `src/app/page.tsx`.

- [ ] **Step 4: Verify**

Run: `npm run build` — Expected: builds; `/en` and `/no` prerendered.
Run: `npm run dev`, open `http://localhost:3000` — Expected: redirects to `/en`, shows "Coming soon". `/no` also works.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: i18n routing, messages, locale layout, theme provider"
```

---

### Task 5: Site chrome — motion wrapper, navbar, footer

**Files:**
- Create: `src/components/FadeIn.tsx`, `src/components/Navbar.tsx`, `src/components/ThemeToggle.tsx`, `src/components/LocaleSwitch.tsx`, `src/components/Footer.tsx`

**Interfaces:**
- Consumes: `Link`, `usePathname` from `@/i18n/navigation`; messages `nav`, `footer`.
- Produces: `<FadeIn delay?>` client wrapper (fade-up on first in-view, honors reduced motion); `<Navbar />` sticky (anchor links, blog link, `LocaleSwitch`, `ThemeToggle`, mobile hamburger); `<Footer profile={ProfileRow} />` with contact links.

- [ ] **Step 1: Write FadeIn**

`src/components/FadeIn.tsx`:

```tsx
"use client";
import { motion, useReducedMotion } from "framer-motion";

export function FadeIn({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Write theme toggle and locale switch**

`src/components/ThemeToggle.tsx`:

```tsx
"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("nav");
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" />;
  const dark = resolvedTheme === "dark";
  return (
    <button
      aria-label={t("toggleTheme")}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 transition-colors hover:border-primary dark:border-neutral-800"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
```

`src/components/LocaleSwitch.tsx`:

```tsx
"use client";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function LocaleSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "en" ? "no" : "en";
  return (
    <Link
      href={pathname}
      locale={other}
      className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium uppercase transition-colors hover:border-primary dark:border-neutral-800"
    >
      {other}
    </Link>
  );
}
```

- [ ] **Step 3: Write navbar and footer**

`src/components/Navbar.tsx`:

```tsx
"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { LocaleSwitch } from "./LocaleSwitch";

const ANCHORS = ["about", "cv", "certifications", "projects"] as const;

export function Navbar() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const links = (
    <>
      {ANCHORS.map((a) => (
        <Link key={a} href={`/#${a}`} onClick={() => setOpen(false)}
          className="text-sm text-neutral-600 transition-colors hover:text-primary dark:text-neutral-300">
          {t(a)}
        </Link>
      ))}
      <Link href="/blog" onClick={() => setOpen(false)}
        className="text-sm text-neutral-600 transition-colors hover:text-primary dark:text-neutral-300">
        {t("blog")}
      </Link>
    </>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/60 bg-white/80 backdrop-blur dark:border-neutral-800/60 dark:bg-neutral-950/80">
      <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          <span className="text-primary">S</span>ondre Haugen
        </Link>
        <div className="hidden items-center gap-6 md:flex">{links}</div>
        <div className="flex items-center gap-2">
          <LocaleSwitch />
          <ThemeToggle />
          <button aria-label={t("menu")} onClick={() => setOpen(!open)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 md:hidden dark:border-neutral-800">
            ☰
          </button>
        </div>
      </nav>
      {open && (
        <div className="flex flex-col gap-4 border-t border-neutral-200/60 px-4 py-4 md:hidden dark:border-neutral-800/60">
          {links}
        </div>
      )}
    </header>
  );
}
```

`src/components/Footer.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import type { ProfileRow } from "@/lib/types";

export async function Footer({ profile }: { profile: ProfileRow | null }) {
  const t = await getTranslations("footer");
  return (
    <footer id="contact" className="border-t border-neutral-200/60 py-10 dark:border-neutral-800/60">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 text-sm text-neutral-500">
        <p className="font-medium text-neutral-700 dark:text-neutral-300">{t("contact")}</p>
        <div className="flex gap-5">
          {profile?.email && <a className="hover:text-primary" href={`mailto:${profile.email}`}>Email</a>}
          {profile?.linkedin_url && <a className="hover:text-primary" href={profile.linkedin_url} target="_blank" rel="noreferrer">LinkedIn</a>}
          {profile?.github_url && <a className="hover:text-primary" href={profile.github_url} target="_blank" rel="noreferrer">GitHub</a>}
        </div>
        <p>© {new Date().getFullYear()} Sondre Haugen</p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 4: Verify build**

Run: `npm run build` — Expected: succeeds (components not yet mounted; type-check is the gate).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: navbar, footer, theme/locale toggles, FadeIn motion wrapper"
```

---

### Task 6: Hero + About sections, assemble home page

**Files:**
- Create: `src/components/sections/Hero.tsx`, `src/components/sections/About.tsx`, `src/lib/markdown.ts` (basic, shiki added Task 10)
- Modify: `src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `getProfile()`, `localize`, `FadeIn`, `Navbar`, `Footer`.
- Produces: `renderMarkdown(md: string): Promise<string>` (async md→HTML); `<Hero profile locale />`, `<About profile locale />` server components. Home page composes Navbar + sections + Footer and passes locale.

- [ ] **Step 1: Write basic markdown helper**

`src/lib/markdown.ts`:

```ts
import { Marked } from "marked";

export async function renderMarkdown(md: string): Promise<string> {
  const marked = new Marked({ async: true, gfm: true });
  return marked.parse(md) as Promise<string>;
}
```

- [ ] **Step 2: Write Hero and About**

`src/components/sections/Hero.tsx`:

```tsx
import Image from "next/image";
import { FadeIn } from "@/components/FadeIn";
import { localize } from "@/lib/localize";
import type { Locale, ProfileRow } from "@/lib/types";

export function Hero({ profile, locale }: { profile: ProfileRow; locale: Locale }) {
  const p = localize(profile, locale);
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
      <div className="mx-auto flex max-w-5xl flex-col-reverse items-center gap-10 px-4 py-24 md:flex-row md:justify-between md:py-32">
        <FadeIn>
          <p className="mb-2 font-medium text-primary">Hei! 👋</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{p.name}</h1>
          <p className="mt-4 max-w-xl text-lg text-neutral-600 dark:text-neutral-400">{p.headline}</p>
          <div className="mt-6 flex gap-3">
            {p.linkedin_url && (
              <a href={p.linkedin_url} target="_blank" rel="noreferrer"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-transform hover:-translate-y-0.5">
                LinkedIn
              </a>
            )}
            {p.github_url && (
              <a href={p.github_url} target="_blank" rel="noreferrer"
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium transition-transform hover:-translate-y-0.5 dark:border-neutral-700">
                GitHub
              </a>
            )}
          </div>
        </FadeIn>
        {p.avatar_url && (
          <FadeIn delay={0.15}>
            <Image src={p.avatar_url} alt={p.name} width={180} height={180}
              className="rounded-2xl border border-neutral-200 object-cover shadow-lg dark:border-neutral-800" priority />
          </FadeIn>
        )}
      </div>
    </section>
  );
}
```

`src/components/sections/About.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { FadeIn } from "@/components/FadeIn";
import { localize } from "@/lib/localize";
import { renderMarkdown } from "@/lib/markdown";
import type { Locale, ProfileRow } from "@/lib/types";

export async function About({ profile, locale }: { profile: ProfileRow; locale: Locale }) {
  const t = await getTranslations("sections");
  const p = localize(profile, locale);
  if (!p.about_md) return null;
  const html = await renderMarkdown(p.about_md);
  return (
    <section id="about" className="mx-auto max-w-5xl px-4 py-16">
      <FadeIn>
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">{t("about")}</h2>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="prose-md" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </FadeIn>
    </section>
  );
}
```

- [ ] **Step 3: Assemble home page**

Replace `src/app/[locale]/page.tsx`:

```tsx
import { setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { getProfile } from "@/lib/queries";
import type { Locale } from "@/lib/types";

export const dynamic = "force-static";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const profile = await getProfile();
  return (
    <>
      <Navbar />
      <main>
        {profile && <Hero profile={profile} locale={locale} />}
        {profile && <About profile={profile} locale={locale} />}
      </main>
      <Footer profile={profile} />
    </>
  );
}
```

- [ ] **Step 4: Verify**

Requires a `.env.local` with real Supabase credentials (see Task 18 human setup — if Supabase project not yet created, `npm run build` still passes because queries return null/[] on fetch failure only if env vars exist; set placeholder env vars pointing at any URL and expect empty sections, or defer visual check).
Run: `npm run build` — Expected: type-check passes, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: hero and about sections on home page"
```

---

### Task 7: CV section — experience/education timeline + skills chips

**Files:**
- Create: `src/components/sections/CV.tsx`
- Modify: `src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `getExperience()`, `getEducation()`, `getSkills()`, `localize`, `FadeIn`, messages `sections`.
- Produces: `<CV experience education skills locale />` server component. Hidden entirely when all three lists empty.

- [ ] **Step 1: Write CV section**

`src/components/sections/CV.tsx`:

```tsx
import { getTranslations } from "next-intl/server";
import { FadeIn } from "@/components/FadeIn";
import { localize } from "@/lib/localize";
import { renderMarkdown } from "@/lib/markdown";
import type { EducationRow, ExperienceRow, Locale, SkillRow } from "@/lib/types";

function TimelineCard({ title, subtitle, period, html }: {
  title: string; subtitle: string; period: string; html?: string;
}) {
  return (
    <div className="relative rounded-2xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-sm text-neutral-500">{period}</span>
      </div>
      <p className="text-sm text-primary">{subtitle}</p>
      {html && <div className="prose-md mt-2 text-sm text-neutral-600 dark:text-neutral-400"
        dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  );
}

export async function CV({ experience, education, skills, locale }: {
  experience: ExperienceRow[]; education: EducationRow[]; skills: SkillRow[]; locale: Locale;
}) {
  const t = await getTranslations("sections");
  if (!experience.length && !education.length && !skills.length) return null;

  const expCards = await Promise.all(
    experience.map(async (row) => {
      const e = localize(row, locale);
      return { id: e.id, title: e.company, subtitle: e.role, period: e.period,
        html: e.description_md ? await renderMarkdown(e.description_md) : undefined };
    }),
  );

  const skillGroups = new Map<string, SkillRow[]>();
  for (const s of skills) {
    skillGroups.set(s.category, [...(skillGroups.get(s.category) ?? []), s]);
  }

  return (
    <section id="cv" className="mx-auto max-w-5xl px-4 py-16">
      <div className="grid gap-12 md:grid-cols-2">
        {expCards.length > 0 && (
          <FadeIn>
            <h2 className="mb-6 text-2xl font-semibold tracking-tight">{t("experience")}</h2>
            <div className="relative flex flex-col gap-4 border-l-2 border-primary/30 pl-6">
              {expCards.map((c) => <TimelineCard key={c.id} {...c} />)}
            </div>
          </FadeIn>
        )}
        {education.length > 0 && (
          <FadeIn delay={0.1}>
            <h2 className="mb-6 text-2xl font-semibold tracking-tight">{t("education")}</h2>
            <div className="relative flex flex-col gap-4 border-l-2 border-primary/30 pl-6">
              {education.map((row) => {
                const e = localize(row, locale);
                return <TimelineCard key={e.id} title={e.school} subtitle={e.degree} period={e.period} />;
              })}
            </div>
          </FadeIn>
        )}
      </div>
      {skills.length > 0 && (
        <FadeIn className="mt-12">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">{t("skills")}</h2>
          <div className="flex flex-col gap-4">
            {[...skillGroups.entries()].map(([category, items]) => (
              <div key={category}>
                <p className="mb-2 text-sm font-medium text-neutral-500">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map((s) => (
                    <span key={s.id}
                      className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm text-primary">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      )}
    </section>
  );
}
```

- [ ] **Step 2: Mount in home page**

In `src/app/[locale]/page.tsx`, extend imports and data fetch:

```tsx
import { CV } from "@/components/sections/CV";
import { getProfile, getExperience, getEducation, getSkills } from "@/lib/queries";
```

In the component body:

```tsx
const [profile, experience, education, skills] = await Promise.all([
  getProfile(), getExperience(), getEducation(), getSkills(),
]);
```

And render after `<About />`:

```tsx
<CV experience={experience} education={education} skills={skills} locale={locale} />
```

- [ ] **Step 3: Verify**

Run: `npm run build` — Expected: succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: CV section with timeline and skill chips"
```

---

### Task 8: Certifications grid

**Files:**
- Create: `src/components/sections/Certifications.tsx`
- Modify: `src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `getCertifications()`, `FadeIn`, messages `sections`.
- Produces: `<Certifications certs />` server component (no locale-split fields on certs). Hidden when empty.

- [ ] **Step 1: Write section**

`src/components/sections/Certifications.tsx`:

```tsx
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { FadeIn } from "@/components/FadeIn";
import type { CertificationRow } from "@/lib/types";

export async function Certifications({ certs }: { certs: CertificationRow[] }) {
  const t = await getTranslations("sections");
  if (!certs.length) return null;
  return (
    <section id="certifications" className="mx-auto max-w-5xl px-4 py-16">
      <FadeIn>
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">{t("certifications")}</h2>
      </FadeIn>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {certs.map((c, i) => (
          <FadeIn key={c.id} delay={Math.min(i * 0.05, 0.3)}>
            <div className="flex h-full flex-col items-center rounded-2xl border border-neutral-200 bg-white p-5 text-center transition-all hover:-translate-y-1 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
              {c.badge_image_url && (
                <Image src={c.badge_image_url} alt={c.name} width={72} height={72}
                  className="mb-3 h-18 w-18 object-contain" />
              )}
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="mt-1 text-xs text-neutral-500">{c.issuer}</p>
              <p className="text-xs text-neutral-400">{c.date}</p>
              {c.credential_url && (
                <a href={c.credential_url} target="_blank" rel="noreferrer"
                  className="mt-auto pt-2 text-xs text-primary hover:underline">
                  {t("viewCredential")}
                </a>
              )}
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Mount in home page**

In `src/app/[locale]/page.tsx` add `getCertifications` to imports and the `Promise.all`, then render after `<CV />`:

```tsx
<Certifications certs={certifications} />
```

- [ ] **Step 3: Verify + commit**

Run: `npm run build` — Expected: succeeds.

```bash
git add -A
git commit -m "feat: certifications badge grid"
```

---

### Task 9: Projects grid

**Files:**
- Create: `src/components/sections/Projects.tsx`
- Modify: `src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `getProjects()`, `localize`, `FadeIn`, messages `sections`.
- Produces: `<Projects projects locale />`; featured projects span 2 columns. Hidden when empty.

- [ ] **Step 1: Write section**

`src/components/sections/Projects.tsx`:

```tsx
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { FadeIn } from "@/components/FadeIn";
import { localize } from "@/lib/localize";
import type { Locale, ProjectRow } from "@/lib/types";

export async function Projects({ projects, locale }: { projects: ProjectRow[]; locale: Locale }) {
  const t = await getTranslations("sections");
  if (!projects.length) return null;
  return (
    <section id="projects" className="mx-auto max-w-5xl px-4 py-16">
      <FadeIn>
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">{t("projects")}</h2>
      </FadeIn>
      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((row, i) => {
          const p = localize(row, locale);
          return (
            <FadeIn key={p.id} delay={Math.min(i * 0.05, 0.3)}
              className={row.featured ? "sm:col-span-2" : ""}>
              <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all hover:-translate-y-1 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
                {p.image_url && (
                  <Image src={p.image_url} alt={p.title} width={800} height={400}
                    className="h-44 w-full object-cover" />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{p.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.tech_tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex gap-4 pt-4 text-sm">
                    {p.repo_url && (
                      <a href={p.repo_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {t("sourceCode")}
                      </a>
                    )}
                    {p.live_url && (
                      <a href={p.live_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {t("liveSite")}
                      </a>
                    )}
                  </div>
                </div>
              </article>
            </FadeIn>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Mount in home page**

Add `getProjects` to imports and `Promise.all` in `src/app/[locale]/page.tsx`; render after `<Certifications />`:

```tsx
<Projects projects={projects} locale={locale} />
```

Final home page body order: `Hero`, `About`, `CV`, `Certifications`, `Projects`, `Footer`.

- [ ] **Step 3: Verify + commit**

Run: `npm run build` — Expected: succeeds.

```bash
git add -A
git commit -m "feat: projects card grid with featured layout"
```

---

### Task 10: Markdown with shiki + reading time (TDD)

**Files:**
- Modify: `src/lib/markdown.ts`
- Create: `src/lib/reading-time.ts`
- Test: `tests/reading-time.test.ts`, `tests/markdown.test.ts`

**Interfaces:**
- Produces: `renderMarkdown` now highlights fenced code blocks via shiki (`github-light`/`github-dark` dual themes; unknown languages fall back to plain `text`). `readingTimeMinutes(md: string): number` — words/200, ceil, min 1.

- [ ] **Step 1: Write failing tests**

`tests/reading-time.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readingTimeMinutes } from "@/lib/reading-time";

describe("readingTimeMinutes", () => {
  it("minimum 1 minute", () => {
    expect(readingTimeMinutes("short text")).toBe(1);
  });
  it("200 words = 1 minute, 201 rounds up", () => {
    expect(readingTimeMinutes(Array(200).fill("word").join(" "))).toBe(1);
    expect(readingTimeMinutes(Array(201).fill("word").join(" "))).toBe(2);
  });
  it("empty string is 1", () => {
    expect(readingTimeMinutes("")).toBe(1);
  });
});
```

`tests/markdown.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderMarkdown } from "@/lib/markdown";

describe("renderMarkdown", () => {
  it("renders basic markdown", async () => {
    const html = await renderMarkdown("# Hi\n\nsome **bold** text");
    expect(html).toContain("<h1");
    expect(html).toContain("<strong>bold</strong>");
  });
  it("highlights fenced code with shiki", async () => {
    const html = await renderMarkdown("```ts\nconst x = 1;\n```");
    expect(html).toContain("shiki");
  });
  it("survives unknown code language", async () => {
    const html = await renderMarkdown("```nosuchlang\nfoo\n```");
    expect(html).toContain("foo");
  });
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test` — Expected: reading-time tests fail (module missing); markdown shiki test fails (no `shiki` class).

- [ ] **Step 3: Implement**

`src/lib/reading-time.ts`:

```ts
export function readingTimeMinutes(md: string): number {
  const words = md.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
```

Replace `src/lib/markdown.ts`:

```ts
import { Marked } from "marked";
import { codeToHtml } from "shiki";

export async function renderMarkdown(md: string): Promise<string> {
  const marked = new Marked({ async: true, gfm: true });
  marked.use({
    async: true,
    walkTokens: async (token) => {
      if (token.type !== "code") return;
      let html: string;
      try {
        html = await codeToHtml(token.text, {
          lang: token.lang || "text",
          themes: { light: "github-light", dark: "github-dark" },
        });
      } catch {
        html = await codeToHtml(token.text, {
          lang: "text",
          themes: { light: "github-light", dark: "github-dark" },
        });
      }
      const t = token as unknown as { type: string; text: string; escaped?: boolean };
      t.type = "html";
      t.text = html;
      t.escaped = true;
    },
  });
  return marked.parse(md) as Promise<string>;
}
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test` — Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: shiki code highlighting and reading time helper"
```

---

### Task 11: Blog list + post page

**Files:**
- Create: `src/app/[locale]/blog/page.tsx`, `src/app/[locale]/blog/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getPublishedPosts()`, `getPostBySlug()`, `postAvailableIn`, `localize`, `renderMarkdown`, `readingTimeMinutes`, `Navbar`, `Footer`, `getProfile`, messages `blog`.
- Produces: `/[locale]/blog` card list (untranslated posts get language tag) and `/[locale]/blog/[slug]` article page. Both force-static with `generateStaticParams`; unknown slugs → `notFound()`.

- [ ] **Step 1: Write blog list page**

`src/app/[locale]/blog/page.tsx`:

```tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FadeIn } from "@/components/FadeIn";
import { getProfile, getPublishedPosts } from "@/lib/queries";
import { localize, postAvailableIn } from "@/lib/localize";
import { readingTimeMinutes } from "@/lib/reading-time";
import type { Locale } from "@/lib/types";

export const dynamic = "force-static";

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const t = await getTranslations("blog");
  const [posts, profile] = await Promise.all([getPublishedPosts(), getProfile()]);

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[60vh] max-w-3xl px-4 py-16">
        <FadeIn>
          <h1 className="mb-8 text-3xl font-bold tracking-tight">{t("title")}</h1>
        </FadeIn>
        {posts.length === 0 && <p className="text-neutral-500">{t("empty")}</p>}
        <div className="flex flex-col gap-4">
          {posts.map((post, i) => {
            const p = localize(post, locale);
            const translated = postAvailableIn(post, locale);
            return (
              <FadeIn key={post.id} delay={Math.min(i * 0.05, 0.3)}>
                <Link href={`/blog/${post.slug}`}
                  className="flex gap-4 rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
                  {post.cover_image_url && (
                    <Image src={post.cover_image_url} alt="" width={120} height={80}
                      className="hidden h-20 w-28 rounded-lg object-cover sm:block" />
                  )}
                  <div>
                    <h2 className="font-semibold">{p.title}</h2>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-neutral-500">
                      {post.published_at && (
                        <time>{new Date(post.published_at).toLocaleDateString(locale === "no" ? "nb-NO" : "en-US", { dateStyle: "medium" })}</time>
                      )}
                      <span>{t("readingTime", { minutes: readingTimeMinutes(p.body_md ?? "") })}</span>
                      {!translated && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{t("untranslated")}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </FadeIn>
            );
          })}
        </div>
      </main>
      <Footer profile={profile} />
    </>
  );
}
```

- [ ] **Step 2: Write post page**

`src/app/[locale]/blog/[slug]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getProfile, getPostBySlug, getPublishedPosts } from "@/lib/queries";
import { localize, postAvailableIn } from "@/lib/localize";
import { renderMarkdown } from "@/lib/markdown";
import { readingTimeMinutes } from "@/lib/reading-time";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/lib/types";

export const dynamic = "force-static";
export const dynamicParams = true;

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return routing.locales.flatMap((locale) =>
    posts.map((p) => ({ locale, slug: p.slug })),
  );
}

export default async function PostPage({ params }: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const t = await getTranslations("blog");
  const [post, profile] = await Promise.all([getPostBySlug(slug), getProfile()]);
  if (!post) notFound();

  const p = localize(post, locale);
  const translated = postAvailableIn(post, locale);
  if (!p.title || !p.body_md) notFound();
  const html = await renderMarkdown(p.body_md);

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[60vh] max-w-3xl px-4 py-16">
        <Link href="/blog" className="text-sm text-primary hover:underline">← {t("back")}</Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{p.title}</h1>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-neutral-500">
          {post.published_at && (
            <time>{new Date(post.published_at).toLocaleDateString(locale === "no" ? "nb-NO" : "en-US", { dateStyle: "medium" })}</time>
          )}
          <span>{t("readingTime", { minutes: readingTimeMinutes(p.body_md) })}</span>
          {!translated && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{t("untranslated")}</span>
          )}
        </div>
        {post.cover_image_url && (
          <Image src={post.cover_image_url} alt="" width={768} height={400}
            className="mt-6 w-full rounded-2xl object-cover" />
        )}
        <article className="prose-md mt-8" dangerouslySetInnerHTML={{ __html: html }} />
      </main>
      <Footer profile={profile} />
    </>
  );
}
```

- [ ] **Step 3: Verify + commit**

Run: `npm run build` — Expected: succeeds; blog routes prerendered.

```bash
git add -A
git commit -m "feat: blog list and post pages with optional translation tag"
```

---

### Task 12: Admin auth — middleware guard + login page

**Files:**
- Modify: `src/middleware.ts`
- Create: `src/app/admin/login/page.tsx`, `src/app/admin/layout.tsx`

**Interfaces:**
- Produces: middleware that (a) runs next-intl for public routes, (b) for `/admin/*` refreshes the Supabase session and redirects unauthenticated users to `/admin/login` (login page itself exempt). `AdminLayout` renders admin nav + sign-out. Login page signs in via `createSupabaseBrowser()` then hard-navigates to `/admin`.

- [ ] **Step 1: Rewrite middleware**

`src/middleware.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { routing } from "@/i18n/routing";

const intl = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/admin")) {
    return intl(request);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && pathname !== "/admin/login") {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (user && pathname === "/admin/login") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 2: Write admin layout + login**

`src/app/admin/layout.tsx`:

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import "../globals.css";

const NAV = [
  ["Dashboard", "/admin"],
  ["Profile", "/admin/profile"],
  ["Experience", "/admin/experience"],
  ["Education", "/admin/education"],
  ["Skills", "/admin/skills"],
  ["Certifications", "/admin/certifications"],
  ["Projects", "/admin/projects"],
  ["Posts", "/admin/posts"],
] as const;

async function signOut() {
  "use server";
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-50 text-neutral-900">
        <div className="flex min-h-screen">
          <aside className="w-52 shrink-0 border-r border-neutral-200 bg-white p-4">
            <p className="mb-4 font-semibold text-primary">Admin</p>
            <nav className="flex flex-col gap-1">
              {NAV.map(([label, href]) => (
                <Link key={href} href={href}
                  className="rounded-lg px-3 py-1.5 text-sm hover:bg-neutral-100">
                  {label}
                </Link>
              ))}
            </nav>
            <form action={signOut} className="mt-6">
              <button className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100">
                Sign out
              </button>
            </form>
          </aside>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
```

`src/app/admin/login/page.tsx`:

```tsx
"use client";
import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    window.location.assign("/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={submit} className="w-80 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="mb-4 text-lg font-semibold">Admin login</h1>
        <label className="mb-3 block text-sm">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" />
        </label>
        <label className="mb-4 block text-sm">
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" />
        </label>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button disabled={busy}
          className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
```

Note: login page is under the admin layout, which shows the sidebar. That is harmless but ugly; acceptable — the middleware redirects unauthenticated users away from every other admin page, and after login the sidebar is wanted. (Nested `<html>` conflict does not occur because login is inside the same admin layout.)

- [ ] **Step 3: Verify + commit**

Run: `npm run build` — Expected: succeeds.
Manual (needs Supabase project + admin user): `/admin` redirects to `/admin/login`; wrong password shows error; correct login lands on dashboard.

```bash
git add -A
git commit -m "feat: admin auth middleware and login page"
```

---

### Task 13: Admin infrastructure — action helpers, form components, dashboard

**Files:**
- Create: `src/lib/admin/action-utils.ts`, `src/lib/schemas.ts`
- Create: `src/components/admin/fields.tsx`, `src/components/admin/ConfirmDelete.tsx`, `src/components/admin/StatusBanner.tsx`
- Create: `src/app/admin/page.tsx`
- Test: `tests/schemas.test.ts`

**Interfaces:**
- Produces:
  - `revalidateSite(): void` — `revalidatePath("/", "layout")`.
  - `requireUser(supabase): Promise<void>` — throws if no session (defense in depth behind middleware).
  - `uploadImage(supabase, file: File, folder: string): Promise<string>` — uploads to `media` bucket at `${folder}/${crypto.randomUUID()}-${file.name}`, returns public URL.
  - zod schemas: `experienceSchema`, `educationSchema`, `skillSchema`, `certificationSchema`, `projectSchema`, `postSchema`, `profileSchema` — each parses `FormData`-shaped string records; empty optional strings become `null`.
  - Form components: `<TextField name label defaultValue required?>`, `<TextArea name label defaultValue rows?>`, `<LangPair render>` helper that renders EN/NO columns side by side, `<ConfirmDelete action id>` (client, `confirm()` before submit), `<StatusBanner />` (reads `?status=saved|error` search param).

- [ ] **Step 1: Write failing schema tests**

`tests/schemas.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { certificationSchema, postSchema, projectSchema } from "@/lib/schemas";

describe("certificationSchema", () => {
  it("accepts minimal input, empty optionals become null", () => {
    const out = certificationSchema.parse({ name: "AZ-900", issuer: "", date: "", credential_url: "" });
    expect(out.name).toBe("AZ-900");
    expect(out.credential_url).toBeNull();
  });
  it("rejects missing name", () => {
    expect(() => certificationSchema.parse({ issuer: "MS" })).toThrow();
  });
});

describe("projectSchema", () => {
  it("splits tech_tags on comma and trims", () => {
    const out = projectSchema.parse({
      title_en: "T", title_no: "", summary_en: "", summary_no: "",
      description_md_en: "", description_md_no: "", tech_tags: "next.js, supabase ,ts",
      repo_url: "", live_url: "", featured: "on",
    });
    expect(out.tech_tags).toEqual(["next.js", "supabase", "ts"]);
    expect(out.featured).toBe(true);
  });
  it("featured absent means false", () => {
    const out = projectSchema.parse({
      title_en: "T", title_no: "", summary_en: "", summary_no: "",
      description_md_en: "", description_md_no: "", tech_tags: "",
      repo_url: "", live_url: "",
    });
    expect(out.featured).toBe(false);
  });
});

describe("postSchema", () => {
  it("slugifies and requires slug", () => {
    const out = postSchema.parse({
      slug: "My First Post!", title_en: "Hi", title_no: "", body_md_en: "x", body_md_no: "",
    });
    expect(out.slug).toBe("my-first-post");
  });
  it("published defaults false", () => {
    const out = postSchema.parse({ slug: "a", title_en: "t", title_no: "", body_md_en: "b", body_md_no: "" });
    expect(out.published).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests, verify failure**

Run: `npm test` — Expected: FAIL, `@/lib/schemas` missing.

- [ ] **Step 3: Implement schemas**

`src/lib/schemas.ts`:

```ts
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
  slug: z.string().min(1).transform(slugify),
  title_en: optional,
  title_no: optional,
  body_md_en: optional,
  body_md_no: optional,
  published: checkbox,
});
```

- [ ] **Step 4: Run tests, verify pass**

Run: `npm test` — Expected: all pass.

- [ ] **Step 5: Implement action utils and form components**

`src/lib/admin/action-utils.ts`:

```ts
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

export function revalidateSite() {
  revalidatePath("/", "layout");
}

export async function requireUser(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
}

export function formDataToRecord(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export async function uploadImage(
  supabase: SupabaseClient,
  file: File,
  folder: string,
): Promise<string> {
  const path = `${folder}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error } = await supabase.storage.from("media").upload(path, file);
  if (error) throw error;
  return supabase.storage.from("media").getPublicUrl(path).data.publicUrl;
}
```

`src/components/admin/fields.tsx`:

```tsx
export function TextField({ name, label, defaultValue, required }: {
  name: string; label: string; defaultValue?: string | null; required?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <input name={name} defaultValue={defaultValue ?? ""} required={required}
        className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2" />
    </label>
  );
}

export function TextArea({ name, label, defaultValue, rows = 6 }: {
  name: string; label: string; defaultValue?: string | null; rows?: number;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      <textarea name={name} defaultValue={defaultValue ?? ""} rows={rows}
        className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs" />
    </label>
  );
}

export function LangPair({ children }: { children: [React.ReactNode, React.ReactNode] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-lg border border-neutral-200 p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-neutral-400">EN</p>
        {children[0]}
      </div>
      <div className="rounded-lg border border-neutral-200 p-3">
        <p className="mb-2 text-xs font-semibold uppercase text-neutral-400">NO</p>
        {children[1]}
      </div>
    </div>
  );
}
```

`src/components/admin/ConfirmDelete.tsx`:

```tsx
"use client";

export function ConfirmDelete({ action, id }: {
  action: (fd: FormData) => Promise<void>; id: string;
}) {
  return (
    <form action={action}
      onSubmit={(e) => { if (!confirm("Delete this item?")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button className="text-sm text-red-600 hover:underline">Delete</button>
    </form>
  );
}
```

`src/components/admin/StatusBanner.tsx`:

```tsx
export function StatusBanner({ status }: { status?: string }) {
  if (status === "saved")
    return <p className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">Saved.</p>;
  if (status === "error")
    return <p className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">Something went wrong — check the form values.</p>;
  return null;
}
```

`src/app/admin/page.tsx`:

```tsx
import Link from "next/link";

const CARDS = [
  ["Profile", "/admin/profile", "Name, headline, about, socials, avatar"],
  ["Experience", "/admin/experience", "Work history timeline"],
  ["Education", "/admin/education", "Schools and degrees"],
  ["Skills", "/admin/skills", "Skill chips by category"],
  ["Certifications", "/admin/certifications", "Badge grid"],
  ["Projects", "/admin/projects", "Project cards"],
  ["Posts", "/admin/posts", "Blog posts"],
] as const;

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(([title, href, desc]) => (
          <Link key={href} href={href}
            className="rounded-2xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md">
            <h2 className="font-semibold text-primary">{title}</h2>
            <p className="mt-1 text-sm text-neutral-500">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify + commit**

Run: `npm run build` — Expected: succeeds.

```bash
git add -A
git commit -m "feat: admin infrastructure - schemas, action utils, form components, dashboard"
```

---

### Task 14: Admin — profile editor with avatar upload

**Files:**
- Create: `src/app/admin/profile/page.tsx`, `src/app/admin/profile/actions.ts`

**Interfaces:**
- Consumes: `profileSchema`, `formDataToRecord`, `requireUser`, `revalidateSite`, `uploadImage`, `createSupabaseServer`, field components, `StatusBanner`.
- Produces: `/admin/profile` form (single row upsert). Avatar file input; when a file is chosen it is uploaded and `avatar_url` updated. Pattern established here (page + `actions.ts` with `redirect("?status=saved")`) is reused by Tasks 15–17.

- [ ] **Step 1: Write action**

`src/app/admin/profile/actions.ts`:

```ts
"use server";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/schemas";
import { formDataToRecord, requireUser, revalidateSite, uploadImage } from "@/lib/admin/action-utils";

export async function saveProfile(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);

  const parsed = profileSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect("/admin/profile?status=error");

  const update: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };

  const avatar = fd.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    update.avatar_url = await uploadImage(supabase, avatar, "avatar");
  }

  const { error } = await supabase.from("profile").update(update).eq("id", 1);
  if (error) redirect("/admin/profile?status=error");

  revalidateSite();
  redirect("/admin/profile?status=saved");
}
```

- [ ] **Step 2: Write page**

`src/app/admin/profile/page.tsx`:

```tsx
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
        {p?.avatar_url && <img src={p.avatar_url} alt="avatar" className="h-24 w-24 rounded-xl object-cover" />}
        <button className="self-start rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white">
          Save
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify + commit**

Run: `npm run build` — Expected: succeeds.
Manual (with Supabase): edit profile, save → banner "Saved.", public page shows change after revalidation.

```bash
git add -A
git commit -m "feat: admin profile editor with avatar upload"
```

---

### Task 15: Admin — experience, education, skills CRUD

**Files:**
- Create: `src/app/admin/experience/page.tsx`, `src/app/admin/experience/actions.ts`
- Create: `src/app/admin/education/page.tsx`, `src/app/admin/education/actions.ts`
- Create: `src/app/admin/skills/page.tsx`, `src/app/admin/skills/actions.ts`
- Create: `src/lib/admin/sortable.ts`

**Interfaces:**
- Consumes: schemas, action utils, field components, `ConfirmDelete`, `StatusBanner`.
- Produces: `moveItem(table, id, direction)` shared sort-swap helper. Three CRUD pages: list of existing rows (each an inline edit form with Save/Delete/↑/↓) + "Add new" form at the top. All actions end with `revalidateSite()` + redirect with status.

- [ ] **Step 1: Write shared sortable helper**

`src/lib/admin/sortable.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function moveItem(
  supabase: SupabaseClient,
  table: string,
  id: string,
  direction: "up" | "down",
): Promise<void> {
  const { data: rows } = await supabase.from(table).select("id, sort").order("sort");
  if (!rows) return;
  const idx = rows.findIndex((r) => r.id === id);
  const swapWith = direction === "up" ? idx - 1 : idx + 1;
  if (idx < 0 || swapWith < 0 || swapWith >= rows.length) return;
  const a = rows[idx];
  const b = rows[swapWith];
  await supabase.from(table).update({ sort: b.sort === a.sort ? a.sort + (direction === "up" ? -1 : 1) : b.sort }).eq("id", a.id);
  await supabase.from(table).update({ sort: a.sort }).eq("id", b.id);
}

export async function nextSort(supabase: SupabaseClient, table: string): Promise<number> {
  const { data } = await supabase.from(table).select("sort").order("sort", { ascending: false }).limit(1);
  return (data?.[0]?.sort ?? -1) + 1;
}
```

- [ ] **Step 2: Write experience CRUD**

`src/app/admin/experience/actions.ts`:

```ts
"use server";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { experienceSchema } from "@/lib/schemas";
import { formDataToRecord, requireUser, revalidateSite } from "@/lib/admin/action-utils";
import { moveItem, nextSort } from "@/lib/admin/sortable";

const PATH = "/admin/experience";

export async function createExperience(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const parsed = experienceSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);
  const sort = await nextSort(supabase, "experience");
  const { error } = await supabase.from("experience").insert({ ...parsed.data, sort });
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
}

export async function updateExperience(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const id = String(fd.get("id"));
  const parsed = experienceSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);
  const { error } = await supabase.from("experience").update(parsed.data).eq("id", id);
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
}

export async function deleteExperience(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await supabase.from("experience").delete().eq("id", String(fd.get("id")));
  revalidateSite();
  redirect(`${PATH}?status=saved`);
}

export async function moveExperience(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await moveItem(supabase, "experience", String(fd.get("id")), fd.get("direction") === "up" ? "up" : "down");
  revalidateSite();
  redirect(PATH);
}
```

`src/app/admin/experience/page.tsx`:

```tsx
import { createSupabaseServer } from "@/lib/supabase/server";
import { TextField, TextArea, LangPair } from "@/components/admin/fields";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { StatusBanner } from "@/components/admin/StatusBanner";
import { createExperience, updateExperience, deleteExperience, moveExperience } from "./actions";
import type { ExperienceRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function ExperienceFields({ row }: { row?: ExperienceRow }) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="company" label="Company" defaultValue={row?.company} required />
        <TextField name="period" label="Period (e.g. 2023 – now)" defaultValue={row?.period} />
      </div>
      <LangPair>
        <TextField name="role_en" label="Role" defaultValue={row?.role_en} />
        <TextField name="role_no" label="Rolle" defaultValue={row?.role_no} />
      </LangPair>
      <LangPair>
        <TextArea name="description_md_en" label="Description (md)" defaultValue={row?.description_md_en} rows={4} />
        <TextArea name="description_md_no" label="Beskrivelse (md)" defaultValue={row?.description_md_no} rows={4} />
      </LangPair>
    </>
  );
}

export default async function ExperienceAdmin({ searchParams }: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("experience").select("*").order("sort");
  const rows = (data ?? []) as ExperienceRow[];

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Experience</h1>
      <StatusBanner status={status} />
      <details className="mb-8 rounded-2xl border border-neutral-200 bg-white p-5" open={rows.length === 0}>
        <summary className="cursor-pointer font-medium text-primary">Add new</summary>
        <form action={createExperience} className="mt-4 flex flex-col gap-4">
          <ExperienceFields />
          <button className="self-start rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white">Add</button>
        </form>
      </details>
      <div className="flex flex-col gap-6">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
            <form action={updateExperience} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={row.id} />
              <ExperienceFields row={row} />
              <button className="self-start rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white">Save</button>
            </form>
            <div className="mt-3 flex items-center gap-4 border-t border-neutral-100 pt-3">
              <form action={moveExperience}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="direction" value="up" />
                <button className="text-sm text-neutral-500 hover:text-primary">↑ Up</button>
              </form>
              <form action={moveExperience}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="direction" value="down" />
                <button className="text-sm text-neutral-500 hover:text-primary">↓ Down</button>
              </form>
              <ConfirmDelete action={deleteExperience} id={row.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write education CRUD**

`src/app/admin/education/actions.ts`:

```ts
"use server";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { educationSchema } from "@/lib/schemas";
import { formDataToRecord, requireUser, revalidateSite } from "@/lib/admin/action-utils";
import { moveItem, nextSort } from "@/lib/admin/sortable";

const PATH = "/admin/education";

export async function createEducation(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const parsed = educationSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);
  const sort = await nextSort(supabase, "education");
  const { error } = await supabase.from("education").insert({ ...parsed.data, sort });
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
}

export async function updateEducation(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const id = String(fd.get("id"));
  const parsed = educationSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);
  const { error } = await supabase.from("education").update(parsed.data).eq("id", id);
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
}

export async function deleteEducation(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await supabase.from("education").delete().eq("id", String(fd.get("id")));
  revalidateSite();
  redirect(`${PATH}?status=saved`);
}

export async function moveEducation(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await moveItem(supabase, "education", String(fd.get("id")), fd.get("direction") === "up" ? "up" : "down");
  revalidateSite();
  redirect(PATH);
}
```

`src/app/admin/education/page.tsx`:

```tsx
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
```

- [ ] **Step 4: Write skills CRUD**

`src/app/admin/skills/actions.ts`:

```ts
"use server";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { skillSchema } from "@/lib/schemas";
import { formDataToRecord, requireUser, revalidateSite } from "@/lib/admin/action-utils";
import { nextSort } from "@/lib/admin/sortable";

const PATH = "/admin/skills";

export async function createSkill(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const parsed = skillSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);
  const sort = await nextSort(supabase, "skills");
  const { error } = await supabase.from("skills").insert({ ...parsed.data, sort });
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
}

export async function deleteSkill(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await supabase.from("skills").delete().eq("id", String(fd.get("id")));
  revalidateSite();
  redirect(`${PATH}?status=saved`);
}
```

`src/app/admin/skills/page.tsx` (skills are simple — add + delete only, no edit/reorder):

```tsx
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
```

- [ ] **Step 5: Verify + commit**

Run: `npm run build` — Expected: succeeds.
Run: `npm test` — Expected: all pass.

```bash
git add -A
git commit -m "feat: admin CRUD for experience, education, skills"
```

---

### Task 16: Admin — certifications + projects CRUD (with image upload)

**Files:**
- Create: `src/app/admin/certifications/page.tsx`, `src/app/admin/certifications/actions.ts`
- Create: `src/app/admin/projects/page.tsx`, `src/app/admin/projects/actions.ts`

**Interfaces:**
- Consumes: `certificationSchema`, `projectSchema`, `uploadImage`, `moveItem`, `nextSort`, field components, `ConfirmDelete`, `StatusBanner`.
- Produces: `/admin/certifications` and `/admin/projects` following the Task 15 pattern, plus file inputs (`badge` / `image`) that upload to Storage on save.

- [ ] **Step 1: Write certifications CRUD**

`src/app/admin/certifications/actions.ts`:

```ts
"use server";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { certificationSchema } from "@/lib/schemas";
import { formDataToRecord, requireUser, revalidateSite, uploadImage } from "@/lib/admin/action-utils";
import { moveItem, nextSort } from "@/lib/admin/sortable";

const PATH = "/admin/certifications";

async function badgeUrl(supabase: Awaited<ReturnType<typeof createSupabaseServer>>, fd: FormData) {
  const badge = fd.get("badge");
  if (badge instanceof File && badge.size > 0) {
    return uploadImage(supabase, badge, "certs");
  }
  return undefined;
}

export async function createCertification(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const parsed = certificationSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);
  const sort = await nextSort(supabase, "certifications");
  const badge_image_url = await badgeUrl(supabase, fd);
  const { error } = await supabase.from("certifications").insert({ ...parsed.data, sort, badge_image_url });
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
}

export async function updateCertification(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const id = String(fd.get("id"));
  const parsed = certificationSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);
  const update: Record<string, unknown> = { ...parsed.data };
  const url = await badgeUrl(supabase, fd);
  if (url) update.badge_image_url = url;
  const { error } = await supabase.from("certifications").update(update).eq("id", id);
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
}

export async function deleteCertification(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await supabase.from("certifications").delete().eq("id", String(fd.get("id")));
  revalidateSite();
  redirect(`${PATH}?status=saved`);
}

export async function moveCertification(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await moveItem(supabase, "certifications", String(fd.get("id")), fd.get("direction") === "up" ? "up" : "down");
  revalidateSite();
  redirect(PATH);
}
```

`src/app/admin/certifications/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Write projects CRUD**

`src/app/admin/projects/actions.ts`:

```ts
"use server";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { projectSchema } from "@/lib/schemas";
import { formDataToRecord, requireUser, revalidateSite, uploadImage } from "@/lib/admin/action-utils";
import { moveItem, nextSort } from "@/lib/admin/sortable";

const PATH = "/admin/projects";

async function imageUrl(supabase: Awaited<ReturnType<typeof createSupabaseServer>>, fd: FormData) {
  const image = fd.get("image");
  if (image instanceof File && image.size > 0) {
    return uploadImage(supabase, image, "projects");
  }
  return undefined;
}

export async function createProject(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const parsed = projectSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);
  const sort = await nextSort(supabase, "projects");
  const image_url = await imageUrl(supabase, fd);
  const { error } = await supabase.from("projects").insert({ ...parsed.data, sort, image_url });
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
}

export async function updateProject(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const id = String(fd.get("id"));
  const parsed = projectSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);
  const update: Record<string, unknown> = { ...parsed.data };
  const url = await imageUrl(supabase, fd);
  if (url) update.image_url = url;
  const { error } = await supabase.from("projects").update(update).eq("id", id);
  if (error) redirect(`${PATH}?status=error`);
  revalidateSite();
  redirect(`${PATH}?status=saved`);
}

export async function deleteProject(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await supabase.from("projects").delete().eq("id", String(fd.get("id")));
  revalidateSite();
  redirect(`${PATH}?status=saved`);
}

export async function moveProject(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await moveItem(supabase, "projects", String(fd.get("id")), fd.get("direction") === "up" ? "up" : "down");
  revalidateSite();
  redirect(PATH);
}
```

`src/app/admin/projects/page.tsx`:

```tsx
import { createSupabaseServer } from "@/lib/supabase/server";
import { TextField, TextArea, LangPair } from "@/components/admin/fields";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { StatusBanner } from "@/components/admin/StatusBanner";
import { createProject, updateProject, deleteProject, moveProject } from "./actions";
import type { ProjectRow } from "@/lib/types";

export const dynamic = "force-dynamic";

function ProjectFields({ row }: { row?: ProjectRow }) {
  return (
    <>
      <LangPair>
        <TextField name="title_en" label="Title" defaultValue={row?.title_en} />
        <TextField name="title_no" label="Tittel" defaultValue={row?.title_no} />
      </LangPair>
      <LangPair>
        <TextField name="summary_en" label="Summary" defaultValue={row?.summary_en} />
        <TextField name="summary_no" label="Sammendrag" defaultValue={row?.summary_no} />
      </LangPair>
      <LangPair>
        <TextArea name="description_md_en" label="Description (md)" defaultValue={row?.description_md_en} rows={4} />
        <TextArea name="description_md_no" label="Beskrivelse (md)" defaultValue={row?.description_md_no} rows={4} />
      </LangPair>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="tech_tags" label="Tech tags (comma-separated)" defaultValue={row?.tech_tags.join(", ")} />
        <TextField name="repo_url" label="Repo URL" defaultValue={row?.repo_url} />
        <TextField name="live_url" label="Live URL" defaultValue={row?.live_url} />
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" name="featured" defaultChecked={row?.featured} />
          <span className="font-medium">Featured (wide card)</span>
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium">Image</span>
        <input type="file" name="image" accept="image/*" className="mt-1 block text-sm" />
      </label>
      {row?.image_url && <img src={row.image_url} alt="" className="h-24 rounded-lg object-cover" />}
    </>
  );
}

export default async function ProjectsAdmin({ searchParams }: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("projects").select("*").order("sort");
  const rows = (data ?? []) as ProjectRow[];

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Projects</h1>
      <StatusBanner status={status} />
      <details className="mb-8 rounded-2xl border border-neutral-200 bg-white p-5" open={rows.length === 0}>
        <summary className="cursor-pointer font-medium text-primary">Add new</summary>
        <form action={createProject} className="mt-4 flex flex-col gap-4">
          <ProjectFields />
          <button className="self-start rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white">Add</button>
        </form>
      </details>
      <div className="flex flex-col gap-6">
        {rows.map((row) => (
          <div key={row.id} className="rounded-2xl border border-neutral-200 bg-white p-5">
            <form action={updateProject} className="flex flex-col gap-4">
              <input type="hidden" name="id" value={row.id} />
              <ProjectFields row={row} />
              <button className="self-start rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white">Save</button>
            </form>
            <div className="mt-3 flex items-center gap-4 border-t border-neutral-100 pt-3">
              <form action={moveProject}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="direction" value="up" />
                <button className="text-sm text-neutral-500 hover:text-primary">↑ Up</button>
              </form>
              <form action={moveProject}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="direction" value="down" />
                <button className="text-sm text-neutral-500 hover:text-primary">↓ Down</button>
              </form>
              <ConfirmDelete action={deleteProject} id={row.id} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify + commit**

Run: `npm run build` — Expected: succeeds.

```bash
git add -A
git commit -m "feat: admin CRUD for certifications and projects with image upload"
```

---

### Task 17: Admin — posts editor with markdown preview

**Files:**
- Create: `src/app/admin/posts/page.tsx`, `src/app/admin/posts/actions.ts`, `src/app/admin/posts/[id]/page.tsx`, `src/components/admin/MarkdownEditor.tsx`

**Interfaces:**
- Consumes: `postSchema`, action utils, `uploadImage`, field components, `ConfirmDelete`, `StatusBanner`.
- Produces: `/admin/posts` list (title, slug, published state, edit link, delete) + create form; `/admin/posts/[id]` edit page. `<MarkdownEditor name label defaultValue>` — client component, textarea + live preview toggle (client-side `marked`, no shiki). Publishing sets `published_at` when first published.

- [ ] **Step 1: Write MarkdownEditor**

`src/components/admin/MarkdownEditor.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Marked } from "marked";

export function MarkdownEditor({ name, label, defaultValue }: {
  name: string; label: string; defaultValue?: string | null;
}) {
  const [value, setValue] = useState(defaultValue ?? "");
  const [preview, setPreview] = useState(false);
  return (
    <div className="text-sm">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <button type="button" onClick={() => setPreview(!preview)}
          className="text-xs text-primary hover:underline">
          {preview ? "Edit" : "Preview"}
        </button>
      </div>
      {preview ? (
        <div className="prose-md min-h-48 rounded-lg border border-neutral-300 px-3 py-2"
          dangerouslySetInnerHTML={{ __html: new Marked({ gfm: true }).parse(value) as string }} />
      ) : (
        <textarea name={name} value={value} onChange={(e) => setValue(e.target.value)} rows={16}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-xs" />
      )}
      {preview && <input type="hidden" name={name} value={value} />}
    </div>
  );
}
```

- [ ] **Step 2: Write actions**

`src/app/admin/posts/actions.ts`:

```ts
"use server";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { postSchema } from "@/lib/schemas";
import { formDataToRecord, requireUser, revalidateSite, uploadImage } from "@/lib/admin/action-utils";

const PATH = "/admin/posts";

export async function createPost(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const parsed = postSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}?status=error`);
  const { data, error } = await supabase
    .from("posts")
    .insert({ ...parsed.data, published: false })
    .select("id")
    .single();
  if (error || !data) redirect(`${PATH}?status=error`);
  redirect(`${PATH}/${data.id}`);
}

export async function updatePost(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  const id = String(fd.get("id"));
  const parsed = postSchema.safeParse(formDataToRecord(fd));
  if (!parsed.success) redirect(`${PATH}/${id}?status=error`);

  const update: Record<string, unknown> = { ...parsed.data };

  const cover = fd.get("cover");
  if (cover instanceof File && cover.size > 0) {
    update.cover_image_url = await uploadImage(supabase, cover, "posts");
  }

  if (parsed.data.published) {
    const { data: existing } = await supabase.from("posts").select("published_at").eq("id", id).single();
    if (!existing?.published_at) update.published_at = new Date().toISOString();
  }

  const { error } = await supabase.from("posts").update(update).eq("id", id);
  if (error) redirect(`${PATH}/${id}?status=error`);
  revalidateSite();
  redirect(`${PATH}/${id}?status=saved`);
}

export async function deletePost(fd: FormData) {
  const supabase = await createSupabaseServer();
  await requireUser(supabase);
  await supabase.from("posts").delete().eq("id", String(fd.get("id")));
  revalidateSite();
  redirect(`${PATH}?status=saved`);
}
```

- [ ] **Step 3: Write list page**

`src/app/admin/posts/page.tsx`:

```tsx
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { TextField } from "@/components/admin/fields";
import { ConfirmDelete } from "@/components/admin/ConfirmDelete";
import { StatusBanner } from "@/components/admin/StatusBanner";
import { createPost, deletePost } from "./actions";
import type { PostRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PostsAdmin({ searchParams }: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("posts").select("*").order("created_at", { ascending: false });
  const rows = (data ?? []) as PostRow[];

  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Posts</h1>
      <StatusBanner status={status} />
      <form action={createPost} className="mb-8 flex items-end gap-3 rounded-2xl border border-neutral-200 bg-white p-5">
        <TextField name="slug" label="Slug for new post" required />
        <button className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white">Create draft</button>
      </form>
      <div className="flex flex-col gap-2">
        {rows.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3">
            <div>
              <Link href={`/admin/posts/${p.id}`} className="font-medium text-primary hover:underline">
                {p.title_en || p.title_no || p.slug}
              </Link>
              <p className="text-xs text-neutral-400">
                /{p.slug} · {p.published ? "published" : "draft"}
                {" · "}
                {[p.title_en && "EN", p.title_no && "NO"].filter(Boolean).join(", ") || "no content"}
              </p>
            </div>
            <ConfirmDelete action={deletePost} id={p.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write edit page**

`src/app/admin/posts/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { TextField } from "@/components/admin/fields";
import { MarkdownEditor } from "@/components/admin/MarkdownEditor";
import { StatusBanner } from "@/components/admin/StatusBanner";
import { updatePost } from "../actions";
import type { PostRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PostEdit({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status } = await searchParams;
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
  const p = data as PostRow | null;
  if (!p) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/admin/posts" className="text-sm text-primary hover:underline">← Posts</Link>
      <h1 className="mb-6 mt-2 text-2xl font-semibold">Edit post</h1>
      <StatusBanner status={status} />
      <form action={updatePost} className="flex flex-col gap-5">
        <input type="hidden" name="id" value={p.id} />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField name="slug" label="Slug" defaultValue={p.slug} required />
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" name="published" defaultChecked={p.published} />
            <span className="font-medium">Published</span>
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4">
            <p className="text-xs font-semibold uppercase text-neutral-400">English</p>
            <TextField name="title_en" label="Title" defaultValue={p.title_en} />
            <MarkdownEditor name="body_md_en" label="Body (markdown)" defaultValue={p.body_md_en} />
          </div>
          <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 p-4">
            <p className="text-xs font-semibold uppercase text-neutral-400">Norsk</p>
            <TextField name="title_no" label="Tittel" defaultValue={p.title_no} />
            <MarkdownEditor name="body_md_no" label="Innhold (markdown)" defaultValue={p.body_md_no} />
          </div>
        </div>
        <label className="block text-sm">
          <span className="font-medium">Cover image</span>
          <input type="file" name="cover" accept="image/*" className="mt-1 block text-sm" />
        </label>
        {p.cover_image_url && <img src={p.cover_image_url} alt="" className="h-32 rounded-lg object-cover" />}
        <button className="self-start rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white">Save</button>
      </form>
    </div>
  );
}
```

- [ ] **Step 5: Verify + commit**

Run: `npm run build` — Expected: succeeds.
Run: `npm test` — Expected: all pass.

```bash
git add -A
git commit -m "feat: admin posts editor with markdown preview and publishing"
```

---

### Task 18: README, human setup checklist, deploy

**Files:**
- Create: `README.md`
- Modify: none

**Interfaces:**
- Produces: documented setup + deployed site.

- [ ] **Step 1: Write README**

`README.md`:

```markdown
# haugentech portfolio

Bilingual (EN/NO) portfolio + blog. Next.js 15, Tailwind 4, Supabase, deployed on Vercel.

## Local development

1. `npm install`
2. Copy `.env.example` to `.env.local`, fill Supabase values.
3. `npm run dev`

## Supabase setup (once)

1. Create a project at supabase.com (free tier).
2. SQL Editor → run `supabase/migrations/0001_init.sql`.
3. Authentication → Users → Add user (email + password). This is the admin login.
4. Copy Project URL and anon key into `.env.local` / Vercel env vars.

## Vercel setup (once)

1. Import the GitHub repo in Vercel.
2. Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy. Admin panel at `/admin`.

## Content

Everything is edited in `/admin`. Saves revalidate the public pages within seconds.

## Tests

`npm test` (Vitest).
```

- [ ] **Step 2: Full verification**

Run: `npm test` — Expected: all pass.
Run: `npm run build` — Expected: clean build.

- [ ] **Step 3: Human setup gate (cannot be automated)**

Ask the user to:
1. Create the Supabase project and run the migration (README steps).
2. Create the admin user.
3. Provide `.env.local` values locally.
4. Import repo in Vercel + set env vars.

Then verify end-to-end locally: log in at `/admin`, fill profile, add one item per section, one blog post; check `/en`, `/no`, `/no/blog` render content, language fallback tag works, theme toggle works.

- [ ] **Step 4: Push**

```bash
git add -A
git commit -m "docs: setup and deployment README"
git push -u origin main
```

- [ ] **Step 5: Confirm production**

After Vercel deploy: open production URL, spot-check `/en`, `/no`, `/blog`, `/admin` login. Expected: all functional.
