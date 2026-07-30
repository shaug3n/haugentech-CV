# haugentech portfolio

Bilingual (EN/NO) portfolio + blog. Next.js 15, Tailwind 4, Supabase, deployed on Vercel.

## Local development

1. `npm install`
2. Copy `.env.example` to `.env.local`, fill Supabase values. `ADMIN_EMAIL` must be
   set or every admin write is refused — see below.
3. `npm run dev`

## Supabase setup (once)

1. Create a project at supabase.com (free tier).
2. SQL Editor → run every file in `supabase/migrations/` in filename order,
   starting with `0001_init.sql`.
   **`0001_init.sql` is not idempotent — run it exactly once, on a fresh project.**
   It seeds the single `profile` row, creates the `media` storage bucket, and
   creates named policies; a second run fails on duplicate keys and duplicate
   policy names, and may leave the schema half-applied. To re-run it, reset the
   database (or create a new project) rather than re-executing it.
3. Authentication → Users → Add user (email + password). This is the admin login.
   The address you use here must match `ADMIN_EMAIL` in the env vars **and** the
   address hardcoded in `public.is_site_owner()` in the migration.
4. **Authentication → Sign In / Providers → Email: turn OFF "Allow new users to
   sign up."** The anon key is public by design, and Supabase enables self-signup
   by default. Write access is restricted to the owner's email by RLS, so a
   stranger's account cannot change anything — but there is no reason to let
   strangers create accounts in your project at all.
5. Copy Project URL and anon key into `.env.local` / Vercel env vars, along with
   `ADMIN_EMAIL`.

### If the storage policies fail to create

The four `create policy ... on storage.objects` statements at the end of the
migration need ownership of `storage.objects`, which some Supabase projects do
not grant to the SQL editor role (you get `must be owner of table objects` or
`permission denied for schema storage`). Two ways out:

* **Simplest:** delete/skip those four statements plus the
  `insert into storage.buckets` line, then create the bucket by hand in Storage →
  New bucket → name `media`, **Public** checked. A public bucket already allows
  anonymous reads, and uploads go through the authenticated admin session.
  Optionally add the same owner-only write rules afterwards via Storage →
  Policies, which runs them as a role that does own the table.
* **Or** run the whole migration from the Supabase dashboard's SQL editor while
  logged in as the project owner (not via a restricted API key / `psql` role) —
  the owner role does have the required privilege on most projects.

### Already set up? Applying later migrations

`0001_init.sql` is the initial schema. Anything numbered above it is a change
made after the first deploy, and an existing project needs those applied by
hand — the app has no migration runner.

Run any migration you have not run yet in SQL Editor, in filename order. Each
one is small and states at the top what it does. Skipping one leaves the
deployed code writing a column the database does not have. It usually does
not break the public site — reads use `select("*")`, so a missing column is
simply absent from the result, and the feature depending on it just doesn't
appear. It breaks the *editor* instead: saving that table in `/admin` fails
with the red error banner. If a save won't stick and the change looks
otherwise correct, check whether a migration is missing before anything else.

| Migration | What it adds |
|---|---|
| `0002_pin_certifications.sql` | `certifications.pinned` — lets you pin certs to the badge row above About |

## Vercel setup (once)

1. Import the GitHub repo in Vercel.
2. Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `ADMIN_EMAIL`.
3. **Merge to `main` first.** This work lives on the `feat/portfolio-mvp` branch,
   and Vercel builds its production deployment from the production branch
   (`main` by default). Until the branch is merged — or the production branch is
   changed to `feat/portfolio-mvp` in Vercel → Settings → Git — "Deploy" produces
   only a preview deployment, and the production URL stays empty.
4. Deploy. Admin panel at `/admin`.

## First run after deploying

**Go to `/admin/profile` and fill in at least the name and headline before
anything else.** The migration seeds the `profile` row with empty strings, and the
Hero section renders that row directly — an unedited profile shows a visibly
broken hero (blank heading, blank headline) on the live site.

## Content

Everything is edited in `/admin`. Saves revalidate the public pages within seconds.

Notes on the editors:

* A post can be saved as a draft with partial content, but cannot be marked
  **Published** until it has both a title and a body in at least one language.
* Link fields (LinkedIn, GitHub, credential, repo, live site) must start with
  `http://` or `https://`.
* Reordering, deleting and saving all report failures with a red banner. A green
  "Saved." means the database accepted the write.
* Ticking **Pinned** on a certification adds it to the compact badge row above
  the About section. It stays in the full certifications grid as well.

## Tests and linting

* `npm test` (Vitest)
* `npm run lint` (ESLint, `next/core-web-vitals` + `next/typescript`)
