import type { Metadata } from "next";
import { getAllArticles } from "@/lib/articles";
import { ArticleCard } from "@/components/ArticleCard";

export const metadata: Metadata = {
  title: "Strategy",
  description: "Strategy guides for Chopped and Guillotine fantasy football leagues.",
};

export default function StrategyIndex() {
  const articles = getAllArticles();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Strategy</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {articles.map((a) => (
          <ArticleCard key={a.slug} article={a} />
        ))}
      </div>
    </div>
  );
}
