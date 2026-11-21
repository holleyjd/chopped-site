import Link from "next/link";
import type { ArticleMeta } from "@/lib/articles";

export function ArticleCard({ article }: { article: ArticleMeta }) {
  return (
    <Link
      href={`/strategy/${article.slug}`}
      className="block rounded-xl border border-border bg-surface p-5 transition hover:border-accent"
    >
      <h3 className="text-lg font-semibold leading-snug">{article.title}</h3>
      <p className="mt-2 text-sm text-muted">{article.description}</p>
      <p className="mt-3 text-xs text-muted">{article.readingMinutes} min read</p>
    </Link>
  );
}
