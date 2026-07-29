import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { FadeIn } from "@/components/FadeIn";
import type { CertificationRow } from "@/lib/types";

export async function Certifications({ certs }: { certs: CertificationRow[] }) {
  const t = await getTranslations("sections");
  if (!certs.length) return null;
  return (
    <section id="certifications" className="mx-auto max-w-5xl px-4 py-16">
      <FadeIn>
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">{t("certifications")}</h2>
      </FadeIn>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {certs.map((c, i) => (
          <FadeIn key={c.id} delay={Math.min(i * 0.05, 0.3)}>
            <div className="flex h-full flex-col items-center rounded-2xl border border-neutral-200 bg-white p-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
              {c.badge_image_url && (
                <Image src={c.badge_image_url} alt={c.name} width={72} height={72}
                  className="mb-3 h-18 w-18 object-contain" />
              )}
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="mt-1 text-xs text-neutral-500">{c.issuer}</p>
              <p className="text-xs text-neutral-400">{c.date}</p>
              {c.credential_url && (
                <a href={c.credential_url} target="_blank" rel="noreferrer"
                  className="mt-auto pt-2 text-xs text-primary hover:underline">
                  {t("viewCredential")}
                </a>
              )}
            </div>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
