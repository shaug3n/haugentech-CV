import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { FadeIn } from "@/components/FadeIn";
import { getProfile, getPublishedPosts } from "@/lib/queries";
import { localize, postContentLocale } from "@/lib/localize";
import { readingTimeMinutes } from "@/lib/reading-time";
import type { Locale } from "@/lib/types";

export const dynamic = "force-static";

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const t = await getTranslations("blog");
  const [posts, profile] = await Promise.all([getPublishedPosts(), getProfile()]);

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[60vh] max-w-3xl px-4 py-16">
        <FadeIn>
          <h1 className="mb-8 text-3xl font-bold tracking-tight">{t("title")}</h1>
        </FadeIn>
        {posts.length === 0 && <p className="text-neutral-500">{t("empty")}</p>}
        <div className="flex flex-col gap-4">
          {posts.map((post, i) => {
            const p = localize(post, locale);
            const contentLocale = postContentLocale(post, locale);
            return (
              <FadeIn key={post.id} delay={Math.min(i * 0.05, 0.3)}>
                <Link href={`/blog/${post.slug}`}
                  className="flex gap-4 rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
                  {post.cover_image_url && (
                    <Image src={post.cover_image_url} alt="" width={120} height={80}
                      className="hidden h-20 w-28 rounded-lg object-cover sm:block" />
                  )}
                  <div>
                    <h2 className="font-semibold">{p.title}</h2>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-neutral-500">
                      {post.published_at && (
                        <time>{new Date(post.published_at).toLocaleDateString(locale === "no" ? "nb-NO" : "en-US", { dateStyle: "medium" })}</time>
                      )}
                      <span>{t("readingTime", { minutes: readingTimeMinutes(p.body_md ?? "") })}</span>
                      {contentLocale && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                          {t(contentLocale === "en" ? "englishOnly" : "norwegianOnly")}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </FadeIn>
            );
          })}
        </div>
      </main>
      <Footer profile={profile} />
    </>
  );
}
