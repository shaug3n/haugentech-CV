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
