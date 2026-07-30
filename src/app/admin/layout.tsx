import Link from "next/link";
import { signOut } from "./actions";
import "../globals.css";

const NAV = [
  ["Dashboard", "/admin"],
  ["Profile", "/admin/profile"],
  ["Experience", "/admin/experience"],
  ["Education", "/admin/education"],
  ["Skills", "/admin/skills"],
  ["Certifications", "/admin/certifications"],
  ["Projects", "/admin/projects"],
  ["Posts", "/admin/posts"],
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-50 text-neutral-900">
        <div className="flex min-h-screen">
          <aside className="w-52 shrink-0 border-r border-neutral-200 bg-white p-4">
            <p className="mb-4 font-semibold text-primary">Admin</p>
            <nav className="flex flex-col gap-1">
              {NAV.map(([label, href]) => (
                <Link key={href} href={href}
                  className="rounded-lg px-3 py-1.5 text-sm hover:bg-neutral-100">
                  {label}
                </Link>
              ))}
            </nav>
            <form action={signOut} className="mt-6">
              <button className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100">
                Sign out
              </button>
            </form>
          </aside>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
