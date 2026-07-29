import type { Locale, PostRow } from "@/lib/types";

type StripLang<K> = K extends `${infer Base}_en` ? Base : K extends `${infer B}_no` ? never : K;
export type Localized<T> = { [K in keyof T as StripLang<K>]: T[K] };

const OTHER: Record<Locale, Locale> = { en: "no", no: "en" };

export function localize<T extends Record<string, unknown>>(
  row: T,
  locale: Locale,
): Localized<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key.endsWith("_en") || key.endsWith("_no")) {
      const base = key.slice(0, -3);
      const suffix = key.slice(-2) as Locale;
      if (suffix !== locale) continue;
      const fallback = row[`${base}_${OTHER[locale]}`];
      out[base] = value === null || value === "" ? (fallback ?? value) : value;
    } else {
      out[key] = value;
    }
  }
  return out as Localized<T>;
}

export function postAvailableIn(post: PostRow, locale: Locale): boolean {
  const title = locale === "en" ? post.title_en : post.title_no;
  const body = locale === "en" ? post.body_md_en : post.body_md_no;
  return Boolean(title) && Boolean(body);
}
