import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type {
  CertificationRow, EducationRow, ExperienceRow, PostRow, ProfileRow, ProjectRow, SkillRow,
} from "@/lib/types";

/**
 * Drift guard: the `*Row` interfaces in src/lib/types.ts are hand-written
 * against supabase/migrations/0001_init.sql. Nothing else connects them, so
 * renaming a column in the SQL (or adding one) leaves the TypeScript quietly
 * describing a table that no longer exists — and `select("*")` casts straight to
 * the interface, so the compiler never notices.
 *
 * SCOPE / LIMITATIONS — deliberately not a SQL parser:
 *   * Only `create table <name> ( ... );` blocks are read, and only the ones
 *     listed in ROW_SAMPLES below.
 *   * One column per line is assumed, which is how 0001_init.sql is written. A
 *     column declared mid-line alongside another would be missed.
 *   * Column TYPES are not checked, only names — this catches a rename or a
 *     removal, not `text` becoming `int`.
 *   * `alter table <t> add column <name> ...;` IS read, from every migration in
 *     supabase/migrations (filename order). Other DDL — `drop column`, `rename
 *     column`, `add column if not exists`, multi-column `add` — is not.
 * If the SQL is ever reformatted such that the extraction breaks, the sanity
 * assertions at the bottom fail loudly rather than the test passing vacuously.
 */

const MIGRATIONS_DIR = path.resolve(__dirname, "../supabase/migrations");

/** Every migration, concatenated in filename order (0001, 0002, ...). */
const SQL = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"))
  .join("\n");

/** Line-leading keywords that introduce a table constraint, not a column. */
const CONSTRAINT_KEYWORDS = new Set([
  "primary", "unique", "check", "constraint", "foreign", "exclude",
]);

function createdColumnsOf(table: string): string[] {
  const match = new RegExp(`create table ${table} \\(([\\s\\S]*?)\\n\\);`, "i").exec(SQL);
  if (!match) throw new Error(`no "create table ${table} (...)" block found in the migrations`);

  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("--"))
    .map((line) => line.split(/[\s(]/)[0].toLowerCase())
    .filter((name) => name !== "" && !CONSTRAINT_KEYWORDS.has(name));
}

/**
 * Columns introduced by a later migration via
 * `alter table <table> add column <name> ...;`. Only this one form is
 * recognised — `add column if not exists` and multi-column `add` clauses are
 * not, matching this file's deliberately-not-a-SQL-parser scope.
 */
function addedColumnsOf(table: string): string[] {
  const re = new RegExp(`alter table ${table} add column (\\w+)`, "gi");
  const names: string[] = [];
  for (const m of SQL.matchAll(re)) names.push(m[1].toLowerCase());
  return names;
}

function columnsOf(table: string): string[] {
  return [...createdColumnsOf(table), ...addedColumnsOf(table)];
}

// One fully-populated sample per table, each annotated with its interface. The
// annotations are what make this bidirectional: TypeScript rejects a sample that
// is missing an interface property or carries an extra one, so a rename in
// types.ts breaks `tsc`, while a rename in the SQL breaks the assertion below.
const profileRow: ProfileRow = {
  id: 1, name: "", headline_en: "", headline_no: "", about_md_en: "", about_md_no: "",
  avatar_url: null, email: null, linkedin_url: null, github_url: null, updated_at: "",
};
const experienceRow: ExperienceRow = {
  id: "", company: "", role_en: "", role_no: "", period: "",
  description_md_en: "", description_md_no: "", sort: 0,
};
const educationRow: EducationRow = {
  id: "", school: "", degree_en: "", degree_no: "", period: "", sort: 0,
};
const skillRow: SkillRow = { id: "", name: "", category: "", sort: 0 };
const certificationRow: CertificationRow = {
  id: "", name: "", issuer: "", date: "", badge_image_url: null, credential_url: null,
  pinned: false, sort: 0,
};
const projectRow: ProjectRow = {
  id: "", title_en: "", title_no: "", summary_en: "", summary_no: "",
  description_md_en: "", description_md_no: "", image_url: null, tech_tags: [],
  repo_url: null, live_url: null, featured: false, sort: 0,
};
const postRow: PostRow = {
  id: "", slug: "", title_en: null, title_no: null, body_md_en: null, body_md_no: null,
  cover_image_url: null, published: false, published_at: null, created_at: "",
};

const ROW_SAMPLES: Record<string, object> = {
  profile: profileRow,
  experience: experienceRow,
  education: educationRow,
  skills: skillRow,
  certifications: certificationRow,
  projects: projectRow,
  posts: postRow,
};

describe("migration columns vs src/lib/types.ts row interfaces", () => {
  for (const [table, sample] of Object.entries(ROW_SAMPLES)) {
    it(`${table}: every SQL column exists on the row interface, and vice versa`, () => {
      const sqlColumns = columnsOf(table).sort();
      const interfaceKeys = Object.keys(sample).sort();
      expect({
        table,
        missingFromInterface: sqlColumns.filter((c) => !interfaceKeys.includes(c)),
        notInMigration: interfaceKeys.filter((k) => !sqlColumns.includes(k)),
      }).toEqual({ table, missingFromInterface: [], notInMigration: [] });
    });
  }

  it("all seven content tables are covered", () => {
    expect(Object.keys(ROW_SAMPLES)).toHaveLength(7);
  });

  it("the extraction actually found columns (guards a silently-broken regex)", () => {
    // If the SQL is reformatted so the block regex or the one-column-per-line
    // assumption stops holding, this fails instead of every table trivially
    // comparing two empty lists.
    for (const table of Object.keys(ROW_SAMPLES)) {
      expect(columnsOf(table).length, `columns extracted for ${table}`).toBeGreaterThan(2);
    }
    expect(columnsOf("posts")).toContain("slug");
    expect(columnsOf("profile")).toContain("headline_no");
  });

  it("picks up columns added by a later migration, not just create-table blocks", () => {
    // `pinned` arrives in 0002 via `alter table ... add column`. If the alter
    // extraction breaks, this fails here instead of the certifications drift
    // check reporting a phantom mismatch.
    expect(columnsOf("certifications")).toContain("pinned");
    expect(createdColumnsOf("certifications")).not.toContain("pinned");
  });
});
