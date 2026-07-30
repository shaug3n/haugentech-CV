import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="text-neutral-500">{t("body")}</p>
      <Link href="/" className="rounded-lg bg-primary px-4 py-2 text-white">
        {t("home")}
      </Link>
    </main>
  );
}
