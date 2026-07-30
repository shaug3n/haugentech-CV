"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { LocaleSwitch } from "./LocaleSwitch";

const ANCHORS = ["about", "cv", "certifications", "projects"] as const;

export function Navbar() {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const links = (
    <>
      {ANCHORS.map((a) => (
        <Link key={a} href={`/#${a}`} onClick={() => setOpen(false)}
          className="text-sm text-neutral-600 transition-colors hover:text-primary dark:text-neutral-300">
          {t(a)}
        </Link>
      ))}
      <Link href="/blog" onClick={() => setOpen(false)}
        className="text-sm text-neutral-600 transition-colors hover:text-primary dark:text-neutral-300">
        {t("blog")}
      </Link>
    </>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200/60 bg-white/80 backdrop-blur dark:border-neutral-800/60 dark:bg-neutral-950/80">
      <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          <span className="text-primary">S</span>ondre Haugen
        </Link>
        <div className="hidden items-center gap-6 md:flex">{links}</div>
        <div className="flex items-center gap-2">
          <LocaleSwitch />
          <ThemeToggle />
          <button aria-label={t("menu")} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(!open)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 md:hidden dark:border-neutral-800">
            ☰
          </button>
        </div>
      </nav>
      {open && (
        <div id="mobile-menu" className="flex flex-col gap-4 border-t border-neutral-200/60 px-4 py-4 md:hidden dark:border-neutral-800/60">
          {links}
        </div>
      )}
    </header>
  );
}
