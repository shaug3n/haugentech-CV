import { describe, it, expect } from "vitest";
import { localize, postAvailableIn } from "@/lib/localize";
import type { ExperienceRow, PostRow } from "@/lib/types";

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

describe("localize with a row interface (Finding 1 regression guard)", () => {
  // The point of this test is the *type* of `experienceRow`: it must be
  // declared as the `ExperienceRow` interface from src/lib/types, not an
  // object literal. Interfaces have no index signature, so if `localize`'s
  // generic constraint regresses back to `Record<string, unknown>`, this
  // file fails `tsc --noEmit` with TS2345 even though vitest itself doesn't
  // type-check.
  const experienceRow: ExperienceRow = {
    id: "e1",
    company: "Acme",
    role_en: "Engineer",
    role_no: "Ingeniør",
    period: "2020-2024",
    description_md_en: "Did things",
    description_md_no: "Gjorde ting",
    sort: 1,
  };

  it("accepts a value typed as an interface row and localizes it", () => {
    const result = localize(experienceRow, "no");
    expect(result.company).toBe("Acme");
    expect(result.role).toBe("Ingeniør");
  });
});

describe("unpaired language columns", () => {
  it("keeps an _en-only field reachable under both locales instead of dropping it", () => {
    const row = { id: "1", note_en: "Only English" };
    expect(localize(row, "en").note).toBe("Only English");
    expect(localize(row, "no").note).toBe("Only English");
  });

  it("keeps an _no-only field reachable under both locales instead of dropping it", () => {
    // `Localized<T>` maps a `_no`-suffixed key with no `_en` sibling to
    // `never`, so this property is invisible to the *type* even though the
    // runtime object still carries it (see localize.ts and the task-3 fix
    // report for why the type can't honestly express this case). The cast
    // documents that gap rather than hiding it.
    const row = { id: "1", note_no: "Bare norsk" };
    const localizedNo = localize(row, "no") as unknown as Record<string, unknown>;
    const localizedEn = localize(row, "en") as unknown as Record<string, unknown>;
    expect(localizedNo.note).toBe("Bare norsk");
    expect(localizedEn.note).toBe("Bare norsk");
  });

  it("still prefers the matching-locale value and applies fallback when both sides of a pair exist", () => {
    const row = { id: "1", title_en: "Hello", title_no: "" };
    expect(localize(row, "en").title).toBe("Hello");
    expect(localize(row, "no").title).toBe("Hello"); // empty "no" falls back to "en"
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
