import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { FadeIn } from "@/components/FadeIn";
import { localize } from "@/lib/localize";
import type { Locale, ProfileRow } from "@/lib/types";

export async function Hero({ profile, locale }: { profile: ProfileRow; locale: Locale }) {
  const t = await getTranslations("hero");
  const tFooter = await getTranslations("footer");
  const p = localize(profile, locale);
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
      <div className="mx-auto flex max-w-5xl flex-col-reverse items-center gap-10 px-4 py-24 md:flex-row md:justify-between md:py-32">
        <FadeIn>
          <p className="mb-2 font-medium text-primary">{t("greeting")}</p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{p.name}</h1>
          <p className="mt-4 max-w-xl text-lg text-neutral-600 dark:text-neutral-400">{p.headline}</p>
          <div className="mt-6 flex gap-3">
            {p.linkedin_url && (
              <a href={p.linkedin_url} target="_blank" rel="noreferrer"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-transform hover:-translate-y-0.5">
                {tFooter("linkedin")}
              </a>
            )}
            {p.github_url && (
              <a href={p.github_url} target="_blank" rel="noreferrer"
                className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium transition-transform hover:-translate-y-0.5 dark:border-neutral-700">
                {tFooter("github")}
              </a>
            )}
          </div>
        </FadeIn>
        {p.avatar_url && (
          <FadeIn delay={0.15}>
            <Image src={p.avatar_url} alt={p.name} width={180} height={180}
              className="rounded-2xl border border-neutral-200 object-cover shadow-lg dark:border-neutral-800" priority />
          </FadeIn>
        )}
      </div>
    </section>
  );
}
