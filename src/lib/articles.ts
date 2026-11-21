import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { marked } from "marked";

const DIR = path.join(process.cwd(), "content", "articles");

export type ArticleMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingMinutes: number;
};

export type Article = ArticleMeta & { html: string };

function load(file: string): Article {
  const raw = fs.readFileSync(path.join(DIR, file), "utf8");
  const { data, content } = matter(raw);
  const words = content.split(/\s+/).filter(Boolean).length;
  return {
    slug: file.replace(/\.md$/, ""),
    title: String(data.title),
    description: String(data.description ?? ""),
    date: String(data.date ?? ""),
    readingMinutes: Math.max(1, Math.round(words / 230)),
    html: marked.parse(content, { async: false }),
  };
}

export function getAllArticles(): ArticleMeta[] {
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const { html: _html, ...meta } = load(f);
      return meta;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getArticle(slug: string): Article | null {
  const file = `${slug}.md`;
  if (!/^[a-z0-9-]+$/.test(slug) || !fs.existsSync(path.join(DIR, file))) return null;
  return load(file);
}
