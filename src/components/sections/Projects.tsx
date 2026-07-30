import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { FadeIn } from "@/components/FadeIn";
import { localize } from "@/lib/localize";
import type { Locale, ProjectRow } from "@/lib/types";

export async function Projects({ projects, locale }: { projects: ProjectRow[]; locale: Locale }) {
  const t = await getTranslations("sections");
  if (!projects.length) return null;
  return (
    <section id="projects" className="mx-auto max-w-5xl px-4 py-16">
      <FadeIn>
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">{t("projects")}</h2>
      </FadeIn>
      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((row, i) => {
          const p = localize(row, locale);
          return (
            <FadeIn key={p.id} delay={Math.min(i * 0.05, 0.3)}
              className={row.featured ? "sm:col-span-2" : ""}>
              <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
                {p.image_url && (
                  <Image src={p.image_url} alt={p.title} width={800} height={400}
                    className="h-44 w-full object-cover" />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{p.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {p.tech_tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto flex gap-4 pt-4 text-sm">
                    {p.repo_url && (
                      <a href={p.repo_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {t("sourceCode")}
                      </a>
                    )}
                    {p.live_url && (
                      <a href={p.live_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {t("liveSite")}
                      </a>
                    )}
                  </div>
                </div>
              </article>
            </FadeIn>
          );
        })}
      </div>
    </section>
  );
}
