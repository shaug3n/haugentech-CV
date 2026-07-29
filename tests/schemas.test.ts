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
