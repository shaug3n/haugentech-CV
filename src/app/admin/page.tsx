import Link from "next/link";

const CARDS = [
  ["Profile", "/admin/profile", "Name, headline, about, socials, avatar"],
  ["Experience", "/admin/experience", "Work history timeline"],
  ["Education", "/admin/education", "Schools and degrees"],
  ["Skills", "/admin/skills", "Skill chips by category"],
  ["Certifications", "/admin/certifications", "Badge grid"],
  ["Projects", "/admin/projects", "Project cards"],
  ["Posts", "/admin/posts", "Blog posts"],
] as const;

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map(([title, href, desc]) => (
          <Link key={href} href={href}
            className="rounded-2xl border border-neutral-200 bg-white p-5 transition-shadow hover:shadow-md">
            <h2 className="font-semibold text-primary">{title}</h2>
            <p className="mt-1 text-sm text-neutral-500">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
