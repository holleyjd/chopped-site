import Link from "next/link";
import { Suspense } from "react";
import { getLeague, getLeagueUsers, getMatchups, getNflState, getRosters } from "@/lib/sleeper";
import { summarizeLeague, type TeamRow } from "@/lib/chopped";

export default function LeaguePage({ params }: PageProps<"/tools/league-tracker/[leagueId]">) {
  return (
    <div className="space-y-6">
      <Link href="/tools/league-tracker" className="text-sm text-muted hover:text-accent">← Back to leagues</Link>
      <Suspense fallback={<p className="text-muted">Loading league from Sleeper…</p>}>
        <LeagueView params={params} />
      </Suspense>
    </div>
  );
}

function weeksFor(
  leagueSeason: string,
  startWeek: number,
  lastRegularWeek: number,
  state: { season: string; season_type: string; week: number } | null,
) {
  // Past seasons: every week is complete. Current season: weeks before the current one are complete.
  if (!state || leagueSeason < state.season) {
    return { completed: range(startWeek, lastRegularWeek), live: null };
  }
  if (state.season_type !== "regular" && state.season_type !== "post") return { completed: [], live: null };
  const current = state.season_type === "post" ? lastRegularWeek + 1 : state.week;
  const completed = range(startWeek, Math.min(current - 1, lastRegularWeek));
  const live = current >= startWeek && current <= lastRegularWeek ? current : null;
  return { completed, live };
}

function range(a: number, b: number) {
  return b < a ? [] : Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

async function LeagueView({ params }: { params: PageProps<"/tools/league-tracker/[leagueId]">["params"] }) {
  const { leagueId } = await params;
  if (!/^\d+$/.test(leagueId)) return <p className="text-accent">That isn&apos;t a valid Sleeper league ID.</p>;

  const [league, rosters, users, state] = await Promise.all([
    getLeague(leagueId),
    getRosters(leagueId),
    getLeagueUsers(leagueId),
    getNflState(),
  ]);
  if (!league) return <p className="text-accent">League not found on Sleeper.</p>;

  const startWeek = Number(league.settings.start_week ?? 1);
  const playoffStart = Number(league.settings.playoff_week_start ?? 0);
  const lastRegularWeek = playoffStart > 1 ? Math.min(playoffStart - 1, 18) : 18;
  const { completed, live } = weeksFor(league.season, startWeek, lastRegularWeek, state);

  const weeks = live != null ? [...completed, live] : completed;
  const matchupLists = await Promise.all(weeks.map((w) => getMatchups(leagueId, w)));
  const matchupsByWeek = Object.fromEntries(weeks.map((w, i) => [w, matchupLists[i]]));

  const summary = summarizeLeague({ league, rosters, users, matchupsByWeek, completedWeeks: completed, liveWeek: live });
  const alive = summary.teams.filter((t) => t.alive);
  const out = summary.teams.filter((t) => !t.alive);
  const lastWeek = completed.at(-1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{league.name}</h1>
        <p className="mt-1 text-muted">{league.season} · {league.total_rosters} teams</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Teams alive" value={`${summary.aliveCount} / ${league.total_rosters}`} />
        <Stat label={lastWeek ? `Week ${lastWeek} cut line` : "Cut line"} value={fmtPts(summary.lastCutLine)} />
        <Stat label="FAAB left in league" value={`$${summary.totalAliveFaab}`} />
        <Stat label="Starting budget" value={`$${summary.faabBudget}`} />
      </div>

      {summary.notes.map((n) => (
        <p key={n} className="rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm">{n}</p>
      ))}

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Still alive</h2>
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Team</th>
                {live != null && <th className="px-3 py-3 text-right">Wk {live} live</th>}
                <th className="px-3 py-3 text-right">Wk {lastWeek ?? "–"}</th>
                <th className="px-3 py-3 text-right">Above cut</th>
                <th className="px-3 py-3 text-right">Avg</th>
                <th className="px-3 py-3 text-right">FAAB left</th>
                <th className="px-4 py-3 text-right">Share</th>
              </tr>
            </thead>
            <tbody>
              {alive.map((t, i) => (
                <AliveRow key={t.rosterId} team={t} showLive={live != null} inDanger={live != null && i >= alive.length - 2} />
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          &ldquo;Above cut&rdquo; is how far each team finished above the lowest surviving score last week.
          &ldquo;Share&rdquo; is each team&apos;s cut of the FAAB still held by surviving teams.
          {live != null && " Red rows are the bottom two in live scoring this week."}
        </p>
      </section>

      {out.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-bold">Chopped</h2>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {out.map((t) => (
              <li key={t.rosterId} className="flex justify-between rounded-lg border border-border bg-surface px-4 py-2.5">
                <span>{t.teamName}</span>
                <span className="text-muted">
                  {t.eliminatedWeek ? `Week ${t.eliminatedWeek} · ${fmtPts(t.weeklyScores[t.eliminatedWeek])}` : "Eliminated"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AliveRow({ team: t, showLive, inDanger }: { team: TeamRow; showLive: boolean; inDanger: boolean }) {
  const margin = t.lastWeekMargin;
  const marginColor = margin == null ? "" : margin < 10 ? "text-accent" : margin < 25 ? "text-warn" : "text-safe";
  return (
    <tr className={`border-b border-border last:border-0 ${inDanger ? "bg-accent-soft" : ""}`}>
      <td className="px-4 py-3">
        <p className="font-medium">{t.teamName}</p>
        {t.teamName !== t.managerName && <p className="text-xs text-muted">{t.managerName}</p>}
      </td>
      {showLive && <td className="px-3 py-3 text-right font-mono">{fmtPts(t.liveScore)}</td>}
      <td className="px-3 py-3 text-right font-mono">{fmtPts(t.lastWeekScore)}</td>
      <td className={`px-3 py-3 text-right font-mono ${marginColor}`}>{margin == null ? "–" : `+${margin.toFixed(1)}`}</td>
      <td className="px-3 py-3 text-right font-mono">{fmtPts(t.avgScore)}</td>
      <td className="px-3 py-3 text-right font-mono">${t.faabRemaining}</td>
      <td className="px-4 py-3 text-right font-mono">{(t.faabShare * 100).toFixed(0)}%</td>
    </tr>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function fmtPts(n: number | null | undefined) {
  return n == null ? "–" : n.toFixed(1);
}
