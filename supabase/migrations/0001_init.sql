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

-- Owner identity --------------------------------------------------------------
-- `to authenticated` on its own is NOT an authorization check. The anon key is
-- embedded in the public client bundle, and Supabase projects ship with public
-- email signup enabled, so any visitor could self-register and would then be
-- "authenticated" — inheriting full write/delete on every table and on the
-- public media bucket. Every write policy below therefore also requires the
-- caller's JWT email claim to be the site owner's.
--
-- The owner's address is hardcoded in the function body on purpose:
--   * this is a single-owner site and this migration is bespoke to this one
--     deployment, so there is no second value to parameterise for;
--   * a Postgres session GUC (`current_setting('app.admin_email')`) would have
--     to be re-set on every pooled connection, which the hosted SQL editor and
--     PgBouncer make unreliable;
--   * putting it in a table would need its own RLS policy to avoid becoming
--     the new hole.
-- If the owner's email ever changes, re-run just this `create or replace` with
-- the new address and update the `ADMIN_EMAIL` env var to match (see
-- src/lib/admin/action-utils.ts — the app-level half of the same check).
create or replace function public.is_site_owner() returns boolean
language sql stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'sondre.haugen99@gmail.com'
$$;

-- RLS: public read, owner-only write ------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['profile','experience','education','skills','certifications','projects','posts']
  loop
    execute format('alter table %I enable row level security', t);
    -- Public read is intentional: the whole point of the site is that these
    -- rows are world-readable through the anon key.
    execute format('create policy "public read" on %I for select using (true)', t);
    execute format('create policy "owner insert" on %I for insert to authenticated with check (public.is_site_owner())', t);
    execute format('create policy "owner update" on %I for update to authenticated using (public.is_site_owner()) with check (public.is_site_owner())', t);
    execute format('create policy "owner delete" on %I for delete to authenticated using (public.is_site_owner())', t);
  end loop;
end $$;

-- Storage: public media bucket ------------------------------------------------
insert into storage.buckets (id, name, public) values ('media', 'media', true);

create policy "media public read" on storage.objects
  for select using (bucket_id = 'media');
create policy "media owner write" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.is_site_owner());
create policy "media owner update" on storage.objects
  for update to authenticated using (bucket_id = 'media' and public.is_site_owner())
  with check (bucket_id = 'media' and public.is_site_owner());
create policy "media owner delete" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.is_site_owner());
