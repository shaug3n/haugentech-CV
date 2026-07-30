# Pinned Certifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner mark certifications as pinned, and render those as a compact badge row between the hero and the About section.

**Architecture:** One new boolean column (`certifications.pinned`) shipped as a second migration, threaded through the row type, the zod schema, and the admin checkbox. A new server component filters the certifications array the page already fetches and renders a wrapping badge row. Pinned certs remain in the full grid below.

**Tech Stack:** Next.js 15 App Router, TypeScript (strict), Tailwind CSS 4, Supabase Postgres, zod, Vitest.

## Global Constraints

- `0001_init.sql` has already been applied to the live Supabase project and is documented as run-once. **Never edit it.** New schema goes in a new numbered migration.
- The admin panel is deliberately plain: no dark mode, no animation, no translation, English labels, one user.
- Public site: all UI labels come from `messages/en.json` / `messages/no.json`, and every key must exist in BOTH files. This feature adds no new labels.
- Blue accent only via the Tailwind `primary` token (`bg-primary` / `text-primary` / `border-primary`) — never a raw hex or a `blue-600` literal.
- The site's entire animation vocabulary is three things: fade-up on scroll into view (`FadeIn`), a small hover lift, and smooth anchor scrolling. The established card hover is `transition-all hover:-translate-y-0.5 hover:shadow-md`. Never put two different `transition-*` property utilities on one element — each sets `transition-property`, so only one survives. This bug has been caught three times in this project.
- Every public surface needs its dark-mode variant.
- Sections with no content render nothing at all — no empty shell.
- Public pages call `setRequestLocale` before rendering and stay statically rendered.
- Tests are Vitest in `tests/`, node environment, matching `tests/**/*.test.ts`. There are 181 tests before this work.
- `npm run lint` must stay clean.

---

### Task 1: Add the `pinned` column, thread it through the type, schema, and admin

**Files:**
- Create: `supabase/migrations/0002_pin_certifications.sql`
- Modify: `src/lib/types.ts` (the `CertificationRow` interface)
- Modify: `src/lib/schemas.ts` (the `certificationSchema` object)
- Modify: `src/app/admin/certifications/page.tsx` (the `CertFields` component)
- Modify: `tests/schema-drift.test.ts` (teach it to read `alter table ... add column` from later migrations)
- Test: `tests/schemas.test.ts`

**Interfaces:**
- Consumes: the `checkbox` zod helper already defined in `src/lib/schemas.ts` — `z.string().optional().transform((v) => v === "on" || v === "true")`. Do not redefine it.
- Produces: `CertificationRow.pinned: boolean`, and `certificationSchema` parsing a `pinned` field to a boolean. Task 2 reads `CertificationRow.pinned`.

**Why the drift test must change in this task:** `tests/schema-drift.test.ts` reads column names out of `supabase/migrations/0001_init.sql` only, and compares them against the `*Row` interfaces. Its own doc comment says: *"`alter table ... add column` in a future migration would need handling here (there is only one migration today)."* The moment `pinned` is added to `CertificationRow`, that test fails with `notInMigration: ["pinned"]`. Extending it is part of this task, not a follow-up.

- [ ] **Step 1: Write the failing schema tests**

Add this `describe` block to `tests/schemas.test.ts`. Put it immediately after the existing `describe("certificationSchema", ...)` block so the two sit together.

```ts
describe("certificationSchema pinned flag", () => {
  it("pinned present means true", () => {
    const out = certificationSchema.parse({
      name: "AZ-900", issuer: "Microsoft", date: "2025-03", credential_url: "", pinned: "on",
    });
    expect(out.pinned).toBe(true);
  });

  it("pinned absent means false", () => {
    const out = certificationSchema.parse({
      name: "AZ-900", issuer: "Microsoft", date: "2025-03", credential_url: "",
    });
    expect(out.pinned).toBe(false);
  });
});
```

`certificationSchema` is already imported at the top of that file — confirm before adding an import.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/schemas.test.ts`

Expected: the two new tests FAIL. `pinned` is not yet in the schema, so zod strips it and `out.pinned` is `undefined`, not `true`/`false`.

- [ ] **Step 3: Write the migration**

Create `supabase/migrations/0002_pin_certifications.sql`:

```sql
-- Pinned certifications render as a compact badge row above the About section,
-- in addition to appearing in the full certifications grid.
--
-- 0001_init.sql has already been applied to the live project and must not be
-- edited; this runs on top of it. Run once, in the Supabase SQL editor.
alter table certifications add column pinned boolean not null default false;
```

- [ ] **Step 4: Add `pinned` to the row interface**

In `src/lib/types.ts`, the `CertificationRow` interface currently reads:

```ts
export interface CertificationRow {
  id: string;
  name: string;
  issuer: string;
  date: string;
  badge_image_url: string | null;
  credential_url: string | null;
  sort: number;
}
```

Add `pinned: boolean;` after `credential_url`, so it becomes:

```ts
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
```

- [ ] **Step 5: Add `pinned` to the schema**

In `src/lib/schemas.ts`, `certificationSchema` currently reads:

```ts
export const certificationSchema = z.object({
  name: z.string().min(1),
  issuer: text,
  date: text,
  credential_url: optionalUrl,
});
```

Add the `pinned` field using the existing `checkbox` helper:

```ts
export const certificationSchema = z.object({
  name: z.string().min(1),
  issuer: text,
  date: text,
  credential_url: optionalUrl,
  pinned: checkbox,
});
```

- [ ] **Step 6: Teach the drift test to read `alter table ... add column`**

In `tests/schema-drift.test.ts`, three changes.

First, replace the single-file read. The current code is:

```ts
const SQL = readFileSync(
  path.resolve(__dirname, "../supabase/migrations/0001_init.sql"),
  "utf8",
);
```

Replace it with a read of every migration, concatenated in filename order:

```ts
const MIGRATIONS_DIR = path.resolve(__dirname, "../supabase/migrations");

/** Every migration, concatenated in filename order (0001, 0002, ...). */
const SQL = readdirSync(MIGRATIONS_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(path.join(MIGRATIONS_DIR, f), "utf8"))
  .join("\n");
```

Update the import on line 2 from `import { readFileSync } from "node:fs";` to:

```ts
import { readFileSync, readdirSync } from "node:fs";
```

Second, make `columnsOf` also pick up added columns. The current function is:

```ts
function columnsOf(table: string): string[] {
  const match = new RegExp(`create table ${table} \\(([\\s\\S]*?)\\n\\);`, "i").exec(SQL);
  if (!match) throw new Error(`no "create table ${table} (...)" block found in the migration`);

  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("--"))
    .map((line) => line.split(/[\s(]/)[0].toLowerCase())
    .filter((name) => name !== "" && !CONSTRAINT_KEYWORDS.has(name));
}
```

Replace it with:

```ts
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
```

Third, update the doc comment's limitations list. Replace this bullet:

```
 *   * `alter table ... add column` in a future migration would need handling
 *     here (there is only one migration today).
```

with:

```
 *   * `alter table <t> add column <name> ...;` IS read, from every migration in
 *     supabase/migrations (filename order). Other DDL — `drop column`, `rename
 *     column`, `add column if not exists`, multi-column `add` — is not.
```

- [ ] **Step 7: Add a drift-test guard for the added column**

Still in `tests/schema-drift.test.ts`, add `pinned: false` to the certification sample so it matches the updated interface. It currently reads:

```ts
const certificationRow: CertificationRow = {
  id: "", name: "", issuer: "", date: "", badge_image_url: null, credential_url: null, sort: 0,
};
```

Change it to:

```ts
const certificationRow: CertificationRow = {
  id: "", name: "", issuer: "", date: "", badge_image_url: null, credential_url: null,
  pinned: false, sort: 0,
};
```

Then add this test inside the existing `describe("migration columns vs src/lib/types.ts row interfaces", ...)` block, after the `"the extraction actually found columns"` test, so a silently-broken `addedColumnsOf` regex fails loudly rather than passing vacuously:

```ts
it("picks up columns added by a later migration, not just create-table blocks", () => {
  // `pinned` arrives in 0002 via `alter table ... add column`. If the alter
  // extraction breaks, this fails here instead of the certifications drift
  // check reporting a phantom mismatch.
  expect(columnsOf("certifications")).toContain("pinned");
  expect(createdColumnsOf("certifications")).not.toContain("pinned");
});
```

- [ ] **Step 8: Add the admin checkbox**

In `src/app/admin/certifications/page.tsx`, the `CertFields` component's field grid currently ends with the credential URL:

```tsx
      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="name" label="Name" defaultValue={row?.name} required />
        <TextField name="issuer" label="Issuer" defaultValue={row?.issuer} />
        <TextField name="date" label="Date (e.g. 2025-03)" defaultValue={row?.date} />
        <TextField name="credential_url" label="Credential URL" defaultValue={row?.credential_url} />
      </div>
```

Add a checkbox as the last grid cell, matching the shape the projects editor uses for its `featured` flag:

```tsx
      <div className="grid gap-4 md:grid-cols-2">
        <TextField name="name" label="Name" defaultValue={row?.name} required />
        <TextField name="issuer" label="Issuer" defaultValue={row?.issuer} />
        <TextField name="date" label="Date (e.g. 2025-03)" defaultValue={row?.date} />
        <TextField name="credential_url" label="Credential URL" defaultValue={row?.credential_url} />
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" name="pinned" defaultChecked={row?.pinned} />
          <span className="font-medium">Pinned (shown above About)</span>
        </label>
      </div>
```

Change nothing else in this file. In particular, do not touch `src/app/admin/certifications/actions.ts` — the shared CRUD factory writes whatever the schema parses, so no action change is needed.

- [ ] **Step 9: Run the full suite and build**

Run: `npm test`
Expected: PASS, 184 tests (181 before, plus two schema tests and one drift test).

Run: `npm run build`
Expected: succeeds.

Run: `npm run lint`
Expected: clean, no output.

- [ ] **Step 10: Commit**

```bash
git add supabase/migrations/0002_pin_certifications.sql src/lib/types.ts src/lib/schemas.ts src/app/admin/certifications/page.tsx tests/schemas.test.ts tests/schema-drift.test.ts
git commit -m "feat(certs): add pinned flag, and teach the drift test about later migrations"
```

---

### Task 2: Render the pinned badge row above About

**Files:**
- Create: `src/components/sections/PinnedCertifications.tsx`
- Modify: `src/app/[locale]/page.tsx`

**Interfaces:**
- Consumes: `CertificationRow` from `@/lib/types`, including the `pinned: boolean` field added in Task 1. `FadeIn` from `@/components/FadeIn` — a client component taking `children`, an optional `delay` number, and an optional `className` string.
- Produces: `<PinnedCertifications certs={CertificationRow[]} />`, a server component. It takes the full certifications array and filters `pinned` internally, so the page passes the same array it already gives the grid.

**Design notes that the code below embodies — do not deviate:**
- No heading, no translation keys. The row sits bare between the hero and About, reading as part of the hero's credential story.
- Returns `null` when nothing is pinned, so the strip vanishes rather than leaving vertical space.
- Badge links to `credential_url` when set, and renders as a non-interactive `<div>` when not — so the markup never produces an `<a>` without an `href`.
- One `transition-all` per element, carrying both the lift and the shadow.
- This component is deliberately NOT the grid card. It shows badge image plus name only: no issuer, no date, no "View credential" text.

- [ ] **Step 1: Write the component**

Create `src/components/sections/PinnedCertifications.tsx`:

```tsx
import Image from "next/image";
import { FadeIn } from "@/components/FadeIn";
import type { CertificationRow } from "@/lib/types";

/**
 * A compact badge row of pinned certifications, rendered between the hero and
 * the About section. Pinned certs also stay in the full grid further down the
 * page — this is a highlight, not a filter.
 *
 * Deliberately not the grid card: badge image and name only, so the row stays
 * short enough that the About text is still near the fold. No heading and no
 * translation keys, so it reads as part of the hero rather than a new section.
 */
export function PinnedCertifications({ certs }: { certs: CertificationRow[] }) {
  const pinned = certs.filter((c) => c.pinned);
  if (!pinned.length) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 pb-4">
      <FadeIn>
        <div className="flex flex-wrap items-stretch justify-center gap-3">
          {pinned.map((c) => {
            const inner = (
              <>
                {c.badge_image_url && (
                  <Image src={c.badge_image_url} alt="" width={40} height={40}
                    className="h-10 w-10 shrink-0 object-contain" />
                )}
                <span className="text-sm font-medium">{c.name}</span>
              </>
            );

            const shell =
              "flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900";

            return c.credential_url ? (
              <a key={c.id} href={c.credential_url} target="_blank" rel="noreferrer"
                className={shell}>
                {inner}
              </a>
            ) : (
              <div key={c.id} className={shell}>
                {inner}
              </div>
            );
          })}
        </div>
      </FadeIn>
    </section>
  );
}
```

Note `alt=""` on the badge image: the certification name sits right beside it as real text, so alt text would make a screen reader announce the same name twice. An empty alt marks the image decorative, which is correct here.

- [ ] **Step 2: Mount it between Hero and About**

In `src/app/[locale]/page.tsx`, add the import alongside the other section imports:

```tsx
import { PinnedCertifications } from "@/components/sections/PinnedCertifications";
```

The `<main>` block currently reads:

```tsx
      <main>
        {profile && <Hero profile={profile} locale={locale} />}
        {profile && <About profile={profile} locale={locale} />}
        <CV experience={experience} education={education} skills={skills} locale={locale} />
        <Certifications certs={certifications} />
        <Projects projects={projects} locale={locale} />
      </main>
```

Insert the pinned row between the hero and About:

```tsx
      <main>
        {profile && <Hero profile={profile} locale={locale} />}
        <PinnedCertifications certs={certifications} />
        {profile && <About profile={profile} locale={locale} />}
        <CV experience={experience} education={education} skills={skills} locale={locale} />
        <Certifications certs={certifications} />
        <Projects projects={projects} locale={locale} />
      </main>
```

Note it is deliberately outside the `{profile && ...}` guards — pinned certs do not depend on the profile row existing. Change nothing else: the `setRequestLocale` call, the `Promise.all`, and `export const dynamic = "force-static"` all stay as they are, and no new query is added.

- [ ] **Step 3: Verify the build and suite**

Run: `npm run build`
Expected: succeeds, with `/en` and `/no` still prerendered.

Run: `npm test`
Expected: PASS, still 184 tests.

Run: `npm run lint`
Expected: clean.

- [ ] **Step 4: Verify it actually renders with pinned data**

No Supabase project is configured in this workspace, so `getCertifications()` returns `[]` and the row correctly renders nothing — which means a build alone proves only the empty path. Prove the populated path the same way this project has verified other section work:

Temporarily edit `getCertifications` in `src/lib/queries.ts` to return fixtures instead of querying, with at least: two certs pinned and two not; one pinned cert **with** a `credential_url` and one pinned cert **without** one; and one pinned cert with no `badge_image_url`. Use `https://example.supabase.co/...` image URLs — they will not resolve, which is fine, since this checks markup and not pixels.

Then run `npm run build` and inspect the generated HTML for both locales under `.next/server/app/` — confirm, quoting the HTML: the pinned row appears before the About section's markup; exactly the two pinned certs appear in it; the pinned cert with a credential URL rendered an `<a href=...>` and the one without rendered a `<div>` with no stray empty `href`; and all four certs still appear in the full grid below.

Then revert the fixture edit completely and confirm `git diff` reports nothing for `src/lib/queries.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/PinnedCertifications.tsx src/app/[locale]/page.tsx
git commit -m "feat(certs): show pinned certifications as a badge row above About"
```

---

### Task 3: Document the migration step in the README

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: `supabase/migrations/0002_pin_certifications.sql` from Task 1.
- Produces: nothing other code depends on.

**Why this is its own task:** the owner has already run `0001_init.sql` against their live project. Without a README change, an existing deployment gets code referencing a `pinned` column the database does not have, and every certifications read fails at runtime. The setup instructions currently describe running exactly one migration.

- [ ] **Step 1: Update the Supabase setup section**

In `README.md`, step 2 of "Supabase setup (once)" currently points at the single migration and warns it is not idempotent. Replace that step so it covers running every migration in order, and add a short note for an already-set-up project.

Change step 2 from:

```markdown
2. SQL Editor → run `supabase/migrations/0001_init.sql`.
```

to:

```markdown
2. SQL Editor → run every file in `supabase/migrations/` in filename order,
   starting with `0001_init.sql`.
```

Leave the existing non-idempotency warning under that step exactly as it is — it still applies to `0001`.

- [ ] **Step 2: Add an upgrade note for an existing deployment**

Add this section immediately after the "If the storage policies fail to create" section:

```markdown
### Already set up? Applying later migrations

`0001_init.sql` is the initial schema. Anything numbered above it is a change
made after the first deploy, and an existing project needs those applied by
hand — the app has no migration runner.

Run any migration you have not run yet in SQL Editor, in filename order. Each
one is small and states at the top what it does. Skipping one leaves the
deployed code referring to a column the database does not have, which surfaces
as content failing to load rather than as a clear error.

| Migration | What it adds |
|---|---|
| `0002_pin_certifications.sql` | `certifications.pinned` — lets you pin certs to the badge row above About |
```

- [ ] **Step 3: Mention pinning in the content notes**

In the "Content" section, the "Notes on the editors" list currently covers post publishing, link fields, and failure banners. Add one bullet:

```markdown
* Ticking **Pinned** on a certification adds it to the compact badge row above
  the About section. It stays in the full certifications grid as well.
```

- [ ] **Step 4: Verify**

Run: `npm run lint`
Expected: clean (markdown is not linted, but confirm nothing else broke).

Read `README.md` top to bottom and confirm the setup steps now describe running multiple migrations consistently — there should be no remaining sentence implying `0001` is the only one.

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs: cover applying later migrations, and the pinned-certification flag"
```

---

## Post-implementation: what the owner must do

After this merges, run `supabase/migrations/0002_pin_certifications.sql` in the Supabase SQL editor. Until then the deployed site's certifications queries will fail, because `select("*")` returns rows without the `pinned` column the code expects.
