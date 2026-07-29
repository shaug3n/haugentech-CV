import { getTranslations } from "next-intl/server";
import type { ProfileRow } from "@/lib/types";

export async function Footer({ profile }: { profile: ProfileRow | null }) {
  const t = await getTranslations("footer");
  return (
    <footer id="contact" className="border-t border-neutral-200/60 py-10 dark:border-neutral-800/60">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-4 text-sm text-neutral-500">
        <p className="font-medium text-neutral-700 dark:text-neutral-300">{t("contact")}</p>
        <div className="flex gap-5">
          {profile?.email && <a className="hover:text-primary" href={`mailto:${profile.email}`}>{t("email")}</a>}
          {profile?.linkedin_url && <a className="hover:text-primary" href={profile.linkedin_url} target="_blank" rel="noreferrer">{t("linkedin")}</a>}
          {profile?.github_url && <a className="hover:text-primary" href={profile.github_url} target="_blank" rel="noreferrer">{t("github")}</a>}
        </div>
        <p>© {new Date().getFullYear()} Sondre Haugen</p>
      </div>
    </footer>
  );
}
