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
