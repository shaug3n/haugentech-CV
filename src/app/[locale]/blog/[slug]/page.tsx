import { notFound } from "next/navigation";
import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { getProfile, getPostBySlug, getPublishedPosts } from "@/lib/queries";
import { localize, postAvailableIn } from "@/lib/localize";
import { renderMarkdown } from "@/lib/markdown";
import { readingTimeMinutes } from "@/lib/reading-time";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/lib/types";

export const dynamic = "force-static";
export const dynamicParams = true;

export async function generateStaticParams() {
  const posts = await getPublishedPosts();
  return routing.locales.flatMap((locale) =>
    posts.map((p) => ({ locale, slug: p.slug })),
  );
}

export default async function PostPage({ params }: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const t = await getTranslations("blog");
  const [post, profile] = await Promise.all([getPostBySlug(slug), getProfile()]);
  if (!post) notFound();

  const p = localize(post, locale);
  const translated = postAvailableIn(post, locale);
  if (!p.title || !p.body_md) notFound();
  const html = await renderMarkdown(p.body_md);

  return (
    <>
      <Navbar />
      <main className="mx-auto min-h-[60vh] max-w-3xl px-4 py-16">
        <Link href="/blog" className="text-sm text-primary hover:underline">← {t("back")}</Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{p.title}</h1>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-neutral-500">
          {post.published_at && (
            <time>{new Date(post.published_at).toLocaleDateString(locale === "no" ? "nb-NO" : "en-US", { dateStyle: "medium" })}</time>
          )}
          <span>{t("readingTime", { minutes: readingTimeMinutes(p.body_md) })}</span>
          {!translated && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{t("untranslated")}</span>
          )}
        </div>
        {post.cover_image_url && (
          <Image src={post.cover_image_url} alt="" width={768} height={400}
            className="mt-6 w-full rounded-2xl object-cover" />
        )}
        <article className="prose-md mt-8" dangerouslySetInnerHTML={{ __html: html }} />
      </main>
      <Footer profile={profile} />
    </>
  );
}
