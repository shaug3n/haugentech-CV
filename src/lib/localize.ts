import type { Locale, PostRow } from "@/lib/types";

type StripLang<K> = K extends `${infer Base}_en` ? Base : K extends `${string}_no` ? never : K;
export type Localized<T> = { [K in keyof T as StripLang<K>]: T[K] };

const OTHER: Record<Locale, Locale> = { en: "no", no: "en" };

export function localize<T extends object>(row: T, locale: Locale): Localized<T> {
  const source = row as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (key.endsWith("_en") || key.endsWith("_no")) {
      const base = key.slice(0, -3);
      const suffix = key.slice(-2) as Locale;
      const siblingKey = `${base}_${OTHER[suffix]}`;
      const hasSibling = Object.prototype.hasOwnProperty.call(source, siblingKey);
      if (suffix !== locale) {
        // No matching-locale counterpart exists for this suffixed column: emit it
        // under its base name anyway rather than silently dropping the data. When
        // a sibling exists, the branch below (triggered while processing that
        // sibling key) is responsible for producing `out[base]`.
        if (!hasSibling) {
          out[base] = value;
        }
        continue;
      }
      const fallback = hasSibling ? source[siblingKey] : undefined;
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

/**
 * Which language the post body a reader is about to see is actually written in,
 * when that differs from the language they are browsing in — i.e. what the
 * "English only" / "Kun norsk" tag on a blog card or post header should say.
 *
 * Returns `null` when no tag belongs: either the post exists in the reader's own
 * locale (nothing to warn about) or in neither, in which case there is nothing
 * to display and hence nothing to label.
 *
 * This lived duplicated in both blog pages and got the direction backwards once
 * already — showing "English only" above Norwegian text — hence one
 * implementation with tests.
 */
export function postContentLocale(post: PostRow, locale: Locale): Locale | null {
  if (postAvailableIn(post, locale)) return null;
  const other = OTHER[locale];
  return postAvailableIn(post, other) ? other : null;
}
