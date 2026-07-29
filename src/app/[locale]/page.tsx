import { setRequestLocale } from "next-intl/server";

export const dynamic = "force-static";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <main className="mx-auto max-w-5xl px-4 py-20">Coming soon</main>;
}
