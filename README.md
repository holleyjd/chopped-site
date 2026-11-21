# Chopped HQ

Strategy articles and live Sleeper tools for Chopped / Guillotine fantasy football leagues.
"Chopped HQ" is a placeholder name; change it in `src/lib/site.ts`.

## Run locally

```bash
npm install
npm run dev   # http://localhost:3000
```

## Where things live

- `content/articles/*.md`: strategy articles. Add a Markdown file with `title`, `description`, `date` frontmatter and it appears on the site.
- `src/lib/sleeper.ts`: Sleeper public API calls (no auth), cached with `use cache`.
- `src/lib/chopped.ts`: elimination replay, cut lines, FAAB math.
- `src/app/tools/league-tracker`: username lookup and per-league standings.

## Known limits

- Sleeper exposes no projections, so the tracker shows actual scores only.
- Sleeper doesn't document a "chopped" league flag. Leagues are tagged by name/settings heuristics, and elimination order is replayed from weekly scores (lowest surviving score is chopped), cross-checked against empty rosters.
- `SLEEPER_API_BASE` env var can point the app at a mock API for testing.

## Deploy

Push to GitHub, import the repo in Vercel, accept defaults. No env vars needed.
