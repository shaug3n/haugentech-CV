import { getTranslations } from "next-intl/server";
import { FadeIn } from "@/components/FadeIn";
import { localize } from "@/lib/localize";
import { renderMarkdown } from "@/lib/markdown";
import type { EducationRow, ExperienceRow, Locale, SkillRow } from "@/lib/types";

function TimelineCard({ title, subtitle, period, html }: {
  title: string; subtitle: string; period: string; html?: string;
}) {
  return (
    <div className="relative rounded-2xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-sm text-neutral-500">{period}</span>
      </div>
      <p className="text-sm text-primary">{subtitle}</p>
      {html && <div className="prose-md mt-2 text-sm text-neutral-600 dark:text-neutral-400"
        dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  );
}

export async function CV({ experience, education, skills, locale }: {
  experience: ExperienceRow[]; education: EducationRow[]; skills: SkillRow[]; locale: Locale;
}) {
  const t = await getTranslations("sections");
  if (!experience.length && !education.length && !skills.length) return null;

  const expCards = await Promise.all(
    experience.map(async (row) => {
      const e = localize(row, locale);
      return { id: e.id, title: e.company, subtitle: e.role, period: e.period,
        html: e.description_md ? await renderMarkdown(e.description_md) : undefined };
    }),
  );

  const skillGroups = new Map<string, SkillRow[]>();
  for (const s of skills) {
    skillGroups.set(s.category, [...(skillGroups.get(s.category) ?? []), s]);
  }

  return (
    <section id="cv" className="mx-auto max-w-5xl px-4 py-16">
      <div className="grid gap-12 md:grid-cols-2">
        {expCards.length > 0 && (
          <FadeIn>
            <h2 className="mb-6 text-2xl font-semibold tracking-tight">{t("experience")}</h2>
            <div className="relative flex flex-col gap-4 border-l-2 border-primary/30 pl-6">
              {expCards.map((c) => <TimelineCard key={c.id} {...c} />)}
            </div>
          </FadeIn>
        )}
        {education.length > 0 && (
          <FadeIn delay={0.1}>
            <h2 className="mb-6 text-2xl font-semibold tracking-tight">{t("education")}</h2>
            <div className="relative flex flex-col gap-4 border-l-2 border-primary/30 pl-6">
              {education.map((row) => {
                const e = localize(row, locale);
                return <TimelineCard key={e.id} title={e.school} subtitle={e.degree} period={e.period} />;
              })}
            </div>
          </FadeIn>
        )}
      </div>
      {skills.length > 0 && (
        <FadeIn className="mt-12">
          <h2 className="mb-6 text-2xl font-semibold tracking-tight">{t("skills")}</h2>
          <div className="flex flex-col gap-4">
            {[...skillGroups.entries()].map(([category, items]) => (
              <div key={category}>
                <p className="mb-2 text-sm font-medium text-neutral-500">{category}</p>
                <div className="flex flex-wrap gap-2">
                  {items.map((s) => (
                    <span key={s.id}
                      className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-sm text-primary">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      )}
    </section>
  );
}
