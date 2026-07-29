import { setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { CV } from "@/components/sections/CV";
import { getProfile, getExperience, getEducation, getSkills } from "@/lib/queries";
import type { Locale } from "@/lib/types";

export const dynamic = "force-static";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = raw as Locale;
  const [profile, experience, education, skills] = await Promise.all([
    getProfile(), getExperience(), getEducation(), getSkills(),
  ]);
  return (
    <>
      <Navbar />
      <main>
        {profile && <Hero profile={profile} locale={locale} />}
        {profile && <About profile={profile} locale={locale} />}
        <CV experience={experience} education={education} skills={skills} locale={locale} />
      </main>
      <Footer profile={profile} />
    </>
  );
}
