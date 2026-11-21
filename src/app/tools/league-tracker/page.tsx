import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getNflState, getUser, getUserLeagues } from "@/lib/sleeper";
import { isLikelyChopped } from "@/lib/chopped";

export const metadata: Metadata = {
  title: "League Tracker",
  description: "Load your Sleeper Chopped leagues: survivors, cut lines, and remaining FAAB.",
};

export default function LeagueTrackerPage({ searchParams }: PageProps<"/tools/league-tracker">) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">League Tracker</h1>
        <p className="max-w-2xl text-muted">
          Enter your Sleeper username. We&apos;ll pull your leagues from Sleeper&apos;s public API. No login needed.
        </p>
      </div>
      <Suspense fallback={<UsernameForm />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function UsernameForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/tools/league-tracker" className="flex max-w-md gap-2">
      <input
        name="username"
        defaultValue={defaultValue}
        placeholder="Sleeper username"
        autoComplete="off"
        required
        className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
      />
      <button className="rounded-lg bg-accent px-4 py-2 font-semibold text-white">Load</button>
    </form>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/tools/league-tracker">["searchParams"] }) {
  const sp = await searchParams;
  const username = typeof sp.username === "string" ? sp.username.trim() : "";
  if (!username) return <UsernameForm />;

  const state = await getNflState();
  const season = typeof sp.season === "string" ? sp.season : state?.season ?? String(new Date().getFullYear());

  const user = await getUser(username);
  if (!user) {
    return (
      <div className="space-y-4">
        <UsernameForm defaultValue={username} />
        <p className="text-accent">No Sleeper user named &ldquo;{username}&rdquo;.</p>
      </div>
    );
  }

  const leagues = await getUserLeagues(user.user_id, season);
  const sorted = [...leagues].sort((a, b) => Number(isLikelyChopped(b)) - Number(isLikelyChopped(a)));

  return (
    <div className="space-y-6">
      <UsernameForm defaultValue={username} />
      <h2 className="text-xl font-bold">
        {user.display_name}&apos;s {season} leagues <span className="text-muted">({leagues.length})</span>
      </h2>
      {sorted.length === 0 ? (
        <p className="text-muted">No NFL leagues found for {season}.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {sorted.map((l) => (
            <li key={l.league_id}>
              <Link
                href={`/tools/league-tracker/${l.league_id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent"
              >
                <div>
                  <p className="font-semibold">{l.name}</p>
                  <p className="text-xs text-muted">
                    {l.total_rosters} teams · {l.status.replace("_", " ")}
                  </p>
                </div>
                {isLikelyChopped(l) && (
                  <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">Chopped</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted">
        Chopped leagues are detected from Sleeper&apos;s league type. Any league can be opened.
      </p>
    </div>
  );
}
