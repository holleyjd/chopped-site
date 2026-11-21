import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Tools" };

const tools = [
  {
    href: "/tools/league-tracker",
    name: "League Tracker",
    blurb: "Enter your Sleeper username to see who's still alive, last week's cut line, and every team's remaining FAAB.",
  },
];

export default function ToolsIndex() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Tools</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map((t) => (
          <Link key={t.href} href={t.href} className="block rounded-xl border border-border bg-surface p-5 hover:border-accent">
            <h2 className="text-lg font-semibold">{t.name}</h2>
            <p className="mt-2 text-sm text-muted">{t.blurb}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
