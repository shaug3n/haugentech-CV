# Pinned Certifications — Design Spec

**Date:** 2026-07-30
**Status:** Approved by user
**Builds on:** `2026-07-29-portfolio-design.md`

## Goal

Let the site owner mark selected certifications as pinned, and show those as a compact badge row between the hero and the About section — so a visitor sees the strongest credentials before reading any prose.

## Decisions

| Question | Decision |
|---|---|
| Do pinned certs also appear in the full grid? | Yes. The grid below stays a complete list of everything held. |
| Visual treatment | Compact badge row — badge image + name only. No issuer, date, or "View credential" text. Smaller than the grid cards so About stays near the fold. |
| Heading above the row? | No. The row sits bare under the hero, reading as part of the hero's credential story rather than a separate section. No new translation keys. |
| Do badges link? | Yes — straight to `credential_url` when set; non-clickable when not. |

## Data model

The `certifications` table gains one column:

```sql
alter table certifications add column pinned boolean not null default false;
```

This ships as **`supabase/migrations/0002_pin_certifications.sql`**, a new file — not an edit to `0001_init.sql`, which has already been applied to the live Supabase project and is documented as run-once.

`CertificationRow` in `src/lib/types.ts` gains `pinned: boolean`. `certificationSchema` in `src/lib/schemas.ts` gains `pinned: checkbox`, reusing the existing helper that reads an HTML checkbox as present/absent. This mirrors `projects.featured` exactly.

The existing schema-drift test fails if the migration and `CertificationRow` disagree, so the column and the type cannot silently diverge.

## Admin

One checkbox in the certifications editor (`src/app/admin/certifications/page.tsx`), labelled "Pinned (shown above About)", placed alongside the existing fields in the same shape as the projects editor's Featured checkbox.

No changes to `src/app/admin/certifications/actions.ts` — the shared CRUD factory writes whatever the schema parses, so adding the field to the schema is sufficient.

## Public site

New server component `src/components/sections/PinnedCertifications.tsx`:

- Takes `certs: CertificationRow[]` — the same array the grid already receives — and filters `pinned` itself.
- Returns `null` when nothing is pinned, so the strip disappears entirely rather than leaving vertical space. This matches the project-wide rule that empty content renders no shell.
- Renders a centered, wrapping flex row. Each item is a badge image plus the certification name.
- An item links to `credential_url` when set, via a plain `<a target="_blank" rel="noreferrer">` matching the grid card's existing link. With no URL, it renders as a non-interactive element.
- Wrapped in a single `FadeIn`. Each badge gets the site's established hover treatment — `transition-all hover:-translate-y-0.5` under one transition utility, never two competing `transition-*` properties.
- Full dark-mode variants on every surface, per project convention.
- Blue accent only via the `primary` token, never a raw hex or `blue-600` literal.

`src/app/[locale]/page.tsx` renders it between `<Hero>` and `<About>`, passing the certifications already fetched in the existing `Promise.all`. No new query and no extra round trip.

Final page order: Hero → pinned badge row → About → CV → Certifications → Projects → Footer.

## Testing

- A schema test asserting `pinned` parses to `true` when the checkbox is present and `false` when absent, mirroring the existing `featured` test.
- The schema-drift test picks up the new column automatically.

The pinned filter is a single expression and does not warrant its own test.

## Out of scope

- Ordering pinned certs independently of the grid's `sort` — they follow the same `sort` order.
- Any limit on how many certs can be pinned. The row wraps; the owner can use judgement.
- Pinning anything other than certifications.
