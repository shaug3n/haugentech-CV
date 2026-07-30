import { getTranslations } from "next-intl/server";
import { FadeIn } from "@/components/FadeIn";
import { localize } from "@/lib/localize";
import { renderMarkdown } from "@/lib/markdown";
import type { Locale, ProfileRow } from "@/lib/types";

export async function About({ profile, locale }: { profile: ProfileRow; locale: Locale }) {
  const t = await getTranslations("sections");
  const p = localize(profile, locale);
  if (!p.about_md) return null;
  const html = await renderMarkdown(p.about_md);
  return (
    <section id="about" className="mx-auto max-w-5xl px-4 py-16">
      <FadeIn>
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">{t("about")}</h2>
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 dark:border-neutral-800 dark:bg-neutral-900">
          <div className="prose-md" dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </FadeIn>
    </section>
  );
}
