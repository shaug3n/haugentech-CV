-- Pinned certifications render as a compact badge row above the About section,
-- in addition to appearing in the full certifications grid.
--
-- 0001_init.sql has already been applied to the live project and must not be
-- edited; this runs on top of it. Run once, in the Supabase SQL editor.
alter table certifications add column pinned boolean not null default false;
