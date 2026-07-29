import { describe, it, expect } from "vitest";
import {
  certificationSchema,
  educationSchema,
  experienceSchema,
  postSchema,
  profileSchema,
  projectSchema,
  skillSchema,
  slugify,
} from "@/lib/schemas";

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

  it("rejects a punctuation-only slug that would slugify to empty", () => {
    expect(() => postSchema.parse({ slug: "!!!", title_en: "t", title_no: "", body_md_en: "b", body_md_no: "" }))
      .toThrow(/Slug must contain at least one letter or number/);
  });

  it("rejects a whitespace-only slug that would slugify to empty", () => {
    expect(() => postSchema.parse({ slug: "   ", title_en: "t", title_no: "", body_md_en: "b", body_md_no: "" }))
      .toThrow(/Slug must contain at least one letter or number/);
  });

  it("accepts a normal title and produces the expected slug", () => {
    const out = postSchema.parse({
      slug: "My Great Post!", title_en: "t", title_no: "", body_md_en: "b", body_md_no: "",
    });
    expect(out.slug).toBe("my-great-post");
  });
});

describe("postSchema publish guard", () => {
  const draft = { slug: "post", title_en: "", title_no: "", body_md_en: "", body_md_no: "" };

  it("allows an entirely empty post to be saved as a draft", () => {
    const out = postSchema.parse(draft);
    expect(out.published).toBe(false);
    expect(out.title_en).toBeNull();
  });

  it("allows a half-finished post (title, no body) to be saved as a draft", () => {
    expect(() => postSchema.parse({ ...draft, title_en: "Hi" })).not.toThrow();
  });

  it("rejects publishing a post with nothing in either language", () => {
    expect(() => postSchema.parse({ ...draft, published: "on" }))
      .toThrow(/needs both a title and body in at least one language/);
  });

  it("rejects publishing a post with a title but no body", () => {
    expect(() => postSchema.parse({ ...draft, title_en: "Hi", published: "on" }))
      .toThrow(/needs both a title and body in at least one language/);
  });

  it("rejects publishing a post with a body but no title", () => {
    expect(() => postSchema.parse({ ...draft, body_md_no: "Innhold", published: "on" }))
      .toThrow(/needs both a title and body in at least one language/);
  });

  it("rejects publishing a post whose title and body are in DIFFERENT languages", () => {
    // Neither language is complete on its own, so both /en and /no would render
    // a broken page.
    expect(() => postSchema.parse({ ...draft, title_en: "Hi", body_md_no: "Innhold", published: "on" }))
      .toThrow(/needs both a title and body in at least one language/);
  });

  it("allows publishing an English-only post", () => {
    const out = postSchema.parse({ ...draft, title_en: "Hi", body_md_en: "Body", published: "on" });
    expect(out.published).toBe(true);
  });

  it("allows publishing a Norwegian-only post", () => {
    const out = postSchema.parse({ ...draft, title_no: "Hei", body_md_no: "Innhold", published: "on" });
    expect(out.published).toBe(true);
  });

  it("allows publishing a bilingual post", () => {
    const out = postSchema.parse({
      ...draft, title_en: "Hi", body_md_en: "Body", title_no: "Hei", body_md_no: "Innhold",
      published: "on",
    });
    expect(out.published).toBe(true);
  });

  it("treats whitespace-only content as absent when publishing", () => {
    // The optional transform nulls whitespace, so this must not sneak past.
    expect(() => postSchema.parse({ ...draft, title_en: "   ", body_md_en: "  ", published: "on" }))
      .toThrow(/needs both a title and body in at least one language/);
  });
});

describe("URL field validation", () => {
  // These values land in `href=` on statically generated public pages.
  const projectBase = {
    title_en: "T", title_no: "", summary_en: "", summary_no: "",
    description_md_en: "", description_md_no: "", tech_tags: "",
  };

  it("rejects a javascript: payload in repo_url", () => {
    expect(() => projectSchema.parse({ ...projectBase, repo_url: "javascript:alert(document.cookie)", live_url: "" }))
      .toThrow(/http:\/\/ or https:\/\//);
  });

  it("rejects a javascript: payload regardless of case or leading whitespace", () => {
    expect(() => projectSchema.parse({ ...projectBase, repo_url: "  JaVaScRiPt:alert(1)", live_url: "" }))
      .toThrow(/http:\/\/ or https:\/\//);
  });

  it("rejects a data: URL", () => {
    expect(() => projectSchema.parse({ ...projectBase, repo_url: "data:text/html,<script>alert(1)</script>", live_url: "" }))
      .toThrow(/http:\/\/ or https:\/\//);
  });

  it("rejects a scheme-relative or bare-host value", () => {
    expect(() => projectSchema.parse({ ...projectBase, repo_url: "example.com", live_url: "" }))
      .toThrow(/http:\/\/ or https:\/\//);
  });

  it("accepts a normal https URL and trims it", () => {
    const out = projectSchema.parse({
      ...projectBase, repo_url: "  https://github.com/user/repo  ", live_url: "http://example.com",
    });
    expect(out.repo_url).toBe("https://github.com/user/repo");
    expect(out.live_url).toBe("http://example.com");
  });

  it("accepts HTTPS in mixed case", () => {
    const out = projectSchema.parse({ ...projectBase, repo_url: "HTTPS://example.com", live_url: "" });
    expect(out.repo_url).toBe("HTTPS://example.com");
  });

  it("still turns an empty URL into null", () => {
    const out = projectSchema.parse({ ...projectBase, repo_url: "", live_url: "   " });
    expect(out.repo_url).toBeNull();
    expect(out.live_url).toBeNull();
  });

  it("validates certification credential_url the same way", () => {
    expect(() => certificationSchema.parse({ name: "AZ-900", credential_url: "javascript:alert(1)" }))
      .toThrow(/http:\/\/ or https:\/\//);
    expect(certificationSchema.parse({ name: "AZ-900", credential_url: "https://learn.microsoft.com/x" }).credential_url)
      .toBe("https://learn.microsoft.com/x");
  });

  it("validates profile linkedin_url and github_url", () => {
    expect(() => profileSchema.parse({ name: "Sondre", linkedin_url: "javascript:alert(1)" }))
      .toThrow(/http:\/\/ or https:\/\//);
    expect(() => profileSchema.parse({ name: "Sondre", github_url: "javascript:alert(1)" }))
      .toThrow(/http:\/\/ or https:\/\//);
    const out = profileSchema.parse({
      name: "Sondre",
      linkedin_url: "https://linkedin.com/in/x",
      github_url: "https://github.com/x",
    });
    expect(out.linkedin_url).toBe("https://linkedin.com/in/x");
    expect(out.github_url).toBe("https://github.com/x");
  });
});

describe("profile email validation", () => {
  it("accepts a valid address", () => {
    expect(profileSchema.parse({ name: "Sondre", email: "sondre@example.com" }).email)
      .toBe("sondre@example.com");
  });
  it("keeps empty and whitespace-only input as null", () => {
    expect(profileSchema.parse({ name: "Sondre", email: "" }).email).toBeNull();
    expect(profileSchema.parse({ name: "Sondre", email: "   " }).email).toBeNull();
  });
  it("rejects a malformed address", () => {
    expect(() => profileSchema.parse({ name: "Sondre", email: "not-an-email" }))
      .toThrow(/valid email address/);
  });
  it("rejects an address with a header-injection newline", () => {
    expect(() => profileSchema.parse({ name: "Sondre", email: "a@b.com\nBcc: x@y.com" }))
      .toThrow(/valid email address/);
  });
});

describe("profileSchema", () => {
  it("accepts minimal input with name only", () => {
    const out = profileSchema.parse({ name: "Sondre Haugen" });
    expect(out.name).toBe("Sondre Haugen");
  });
  it("rejects missing name", () => {
    expect(() => profileSchema.parse({})).toThrow();
  });
  it("rejects empty name", () => {
    expect(() => profileSchema.parse({ name: "" })).toThrow();
  });
});

describe("experienceSchema", () => {
  it("accepts minimal input with company only", () => {
    const out = experienceSchema.parse({ company: "Acme AS" });
    expect(out.company).toBe("Acme AS");
  });
  it("rejects missing company", () => {
    expect(() => experienceSchema.parse({})).toThrow();
  });
  it("rejects empty company", () => {
    expect(() => experienceSchema.parse({ company: "" })).toThrow();
  });
});

describe("educationSchema", () => {
  it("accepts minimal input with school only", () => {
    const out = educationSchema.parse({ school: "NTNU" });
    expect(out.school).toBe("NTNU");
  });
  it("rejects missing school", () => {
    expect(() => educationSchema.parse({})).toThrow();
  });
  it("rejects empty school", () => {
    expect(() => educationSchema.parse({ school: "" })).toThrow();
  });
});

describe("skillSchema", () => {
  it("accepts a valid name and category", () => {
    const out = skillSchema.parse({ name: "TypeScript", category: "Languages" });
    expect(out).toEqual({ name: "TypeScript", category: "Languages" });
  });
  it("rejects missing name", () => {
    expect(() => skillSchema.parse({ category: "Languages" })).toThrow();
  });
  it("rejects missing category", () => {
    expect(() => skillSchema.parse({ name: "TypeScript" })).toThrow();
  });
  it("rejects empty name", () => {
    expect(() => skillSchema.parse({ name: "", category: "Languages" })).toThrow();
  });
  it("rejects empty category", () => {
    expect(() => skillSchema.parse({ name: "TypeScript", category: "" })).toThrow();
  });
});

describe("shared transforms", () => {
  it("the empty-string-preserving transform yields an actual empty string, not undefined/null", () => {
    const out = experienceSchema.parse({ company: "Acme AS" });
    expect(out.role_en).toBe("");
    expect(out.role_en).not.toBeUndefined();
    expect(out.role_en).not.toBeNull();
  });

  it("the empty-string-preserving transform passes through an explicit empty string unchanged", () => {
    const out = experienceSchema.parse({ company: "Acme AS", role_en: "" });
    expect(out.role_en).toBe("");
  });

  it("the optional transform turns whitespace-only input into null, not a whitespace string", () => {
    const out = profileSchema.parse({ name: "Sondre", email: "   " });
    expect(out.email).toBeNull();
  });

  it("the optional transform trims real values", () => {
    const out = profileSchema.parse({ name: "Sondre", email: "  sondre@example.com  " });
    expect(out.email).toBe("sondre@example.com");
  });

  it("splits comma-separated tags, dropping trailing/repeated commas and surrounding whitespace", () => {
    const out = projectSchema.parse({
      title_en: "T", title_no: "", summary_en: "", summary_no: "",
      description_md_en: "", description_md_no: "",
      tech_tags: "next.js,, supabase ,  , ts,",
      repo_url: "", live_url: "",
    });
    expect(out.tech_tags).toEqual(["next.js", "supabase", "ts"]);
  });
});

describe("slugify", () => {
  it("maps Norwegian æ, å to a and ø to o", () => {
    expect(slugify("æøå")).toBe("aoa");
  });
  it("lowercases mixed case input", () => {
    expect(slugify("HeLLo World")).toBe("hello-world");
  });
  it("collapses runs of punctuation and spaces to a single hyphen", () => {
    expect(slugify("Hello!!!   World??")).toBe("hello-world");
  });
  it("trims leading and trailing hyphens", () => {
    expect(slugify("  --Hello--  ")).toBe("hello");
  });
  it("slugifies a realistic Norwegian title", () => {
    expect(slugify("Kaffe på Trøndelag!")).toBe("kaffe-pa-trondelag");
  });
  it("returns an empty string for punctuation-only input", () => {
    expect(slugify("!!!")).toBe("");
  });
  it("returns an empty string for whitespace-only input", () => {
    expect(slugify("   ")).toBe("");
  });
});
