import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getProfile,
  getExperience,
  getEducation,
  getSkills,
  getCertifications,
  getProjects,
  getPublishedPosts,
  getPostBySlug,
} from "@/lib/queries";

// Finding 2 regression guard: with Supabase env vars absent, `createClient`
// used to throw synchronously inside `supabaseStatic()`, before any query
// even ran. That meant every exported query function threw instead of
// degrading to `null`/`[]`, which breaks `npm run build` on a machine with
// no `.env.local`. These tests pin the "no throw, graceful empty result"
// contract directly against the unconfigured environment.

describe("queries with Supabase unconfigured", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("getProfile resolves to null without throwing", async () => {
    await expect(getProfile()).resolves.toBeNull();
  });

  it("getPostBySlug resolves to null without throwing", async () => {
    await expect(getPostBySlug("some-slug")).resolves.toBeNull();
  });

  it("getExperience resolves to [] without throwing", async () => {
    await expect(getExperience()).resolves.toEqual([]);
  });

  it("getEducation resolves to [] without throwing", async () => {
    await expect(getEducation()).resolves.toEqual([]);
  });

  it("getSkills resolves to [] without throwing", async () => {
    await expect(getSkills()).resolves.toEqual([]);
  });

  it("getCertifications resolves to [] without throwing", async () => {
    await expect(getCertifications()).resolves.toEqual([]);
  });

  it("getProjects resolves to [] without throwing", async () => {
    await expect(getProjects()).resolves.toEqual([]);
  });

  it("getPublishedPosts resolves to [] without throwing", async () => {
    await expect(getPublishedPosts()).resolves.toEqual([]);
  });
});
