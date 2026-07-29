"use client";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function LocaleSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "en" ? "no" : "en";
  return (
    <Link
      href={pathname}
      locale={other}
      className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium uppercase transition-colors hover:border-primary dark:border-neutral-800"
    >
      {other}
    </Link>
  );
}
