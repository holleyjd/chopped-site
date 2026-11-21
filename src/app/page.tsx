import Link from "next/link";
import { getAllArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";
import { SITE_TAGLINE } from "@/lib/site";

export default function Home() {
  const articles = getAllArticles().slice(0, 4);
  return (
    <div className="space-y-14">
      <section className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wider text-accent">Don&apos;t finish last</p>
        <h1 className="max-w-2xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          Survive the chop. Spend your FAAB like it matters.
        </h1>
        <p className="max-w-2xl text-lg text-muted">{SITE_TAGLINE}</p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/tools/league-tracker" className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white">
            Load my Sleeper leagues
          </Link>
          <Link href="/strategy" className="rounded-lg border border-border bg-surface px-5 py-2.5 font-semibold">
            Read the strategy
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Strategy</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {articles.map((a) => (
            <ArticleCard key={a.slug} article={a} />
          ))}
        </div>
      </section>
    </div>
  );
}
