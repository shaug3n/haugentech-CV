import Link from "next/link";
import "./globals.css";

export default function NotFound() {
  return (
    <html lang="en">
      <body className="bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
        <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-3xl font-semibold">Page not found</h1>
          <p className="text-neutral-500">
            The page you are looking for does not exist.
          </p>
          {/* Hardcoded /en, not the next-intl `Link`: this root not-found is
              rendered outside the [locale] segment, so there is no request
              locale to be relative to. */}
          <Link href="/en" className="rounded-lg bg-primary px-4 py-2 text-white">
            Go home
          </Link>
        </main>
      </body>
    </html>
  );
}
