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
