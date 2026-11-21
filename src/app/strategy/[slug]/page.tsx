import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllArticles, getArticle } from "@/lib/articles";

export function generateStaticParams() {
  return getAllArticles().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/strategy/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  return article ? { title: article.title, description: article.description } : {};
}

export default async function ArticlePage({ params }: PageProps<"/strategy/[slug]">) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  return (
    <article className="mx-auto max-w-2xl">
      <Link href="/strategy" className="text-sm text-muted hover:text-accent">← All strategy</Link>
      <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{article.title}</h1>
      <p className="mt-3 text-sm text-muted">{article.readingMinutes} min read</p>
      <div className="prose mt-8" dangerouslySetInnerHTML={{ __html: article.html }} />
    </article>
  );
}
