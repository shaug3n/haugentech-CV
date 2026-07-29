import { describe, it, expect } from "vitest";
import en from "../messages/en.json";
import no from "../messages/no.json";

/**
 * Every dotted key path in a message catalogue. Leaves are the translated
 * strings; the paths are what `useTranslations`/`getTranslations` look up.
 */
function keyPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("message catalogue parity", () => {
  const enPaths = keyPaths(en).sort();
  const noPaths = keyPaths(no).sort();

  it("en.json and no.json contain exactly the same key paths", () => {
    // next-intl resolves keys per-locale, so a key added to only one catalogue
    // renders the raw key path (or throws in dev) on the other locale's pages.
    // Failure output names the offending keys directly.
    expect({
      missingFromNorwegian: enPaths.filter((p) => !noPaths.includes(p)),
      missingFromEnglish: noPaths.filter((p) => !enPaths.includes(p)),
    }).toEqual({ missingFromNorwegian: [], missingFromEnglish: [] });
  });

  it("both catalogues are non-trivial (guards against an empty file passing vacuously)", () => {
    expect(enPaths.length).toBeGreaterThan(20);
    expect(enPaths).toEqual(noPaths);
  });

  it("every leaf is a non-empty string in both catalogues", () => {
    const emptyLeaves = (catalogue: unknown, label: string) =>
      keyPaths(catalogue).filter((path) => {
        const leaf = path.split(".").reduce<unknown>(
          (node, key) => (node as Record<string, unknown>)[key], catalogue,
        );
        return typeof leaf !== "string" || leaf.trim() === "";
      }).map((path) => `${label}:${path}`);

    expect([...emptyLeaves(en, "en"), ...emptyLeaves(no, "no")]).toEqual([]);
  });
});
