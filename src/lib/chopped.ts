import type {
  SleeperLeague,
  SleeperLeagueUser,
  SleeperMatchup,
  SleeperRoster,
} from "./sleeper";

export type TeamRow = {
  rosterId: number;
  ownerId: string | null;
  teamName: string;
  managerName: string;
  alive: boolean;
  eliminatedWeek: number | null;
  faabRemaining: number;
  faabShare: number; // share of all FAAB still held by alive teams, 0-1
  seasonPoints: number;
  weeklyScores: Record<number, number>;
  lastWeekScore: number | null;
  lastWeekMargin: number | null; // points above that week's lowest alive score
  avgScore: number | null;
  liveScore: number | null;
};

export type LeagueSummary = {
  teams: TeamRow[]; // alive first (by live score, then last week), then eliminated by most recent
  aliveCount: number;
  faabBudget: number;
  totalAliveFaab: number;
  completedWeeks: number[];
  liveWeek: number | null;
  lastCutLine: number | null; // lowest alive score in the last completed week
  notes: string[];
};

/**
 * Sleeper marks Chopped leagues with settings.type === 3 (0 redraft, 1 keeper, 2 dynasty) and adds
 * settings.last_chopped_leg. Undocumented, confirmed against a live league 2026-11-21.
 */
export function isLikelyChopped(league: SleeperLeague): boolean {
  const s = league.settings ?? {};
  if (Number(s.type) === 3 || s.last_chopped_leg != null) return true;
  if (/chop|guillotine/i.test(league.name)) return true;
  return Object.entries(league.settings ?? {}).some(
    ([key, value]) => /chop|guillotine|elim/i.test(key) && Boolean(value),
  );
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export function summarizeLeague(args: {
  league: SleeperLeague;
  rosters: SleeperRoster[];
  users: SleeperLeagueUser[];
  matchupsByWeek: Record<number, SleeperMatchup[]>;
  completedWeeks: number[];
  liveWeek: number | null;
}): LeagueSummary {
  const { league, rosters, users, matchupsByWeek, completedWeeks, liveWeek } = args;
  const notes: string[] = [];
  const faabBudget = Number(league.settings?.waiver_budget ?? 0);
  const userById = new Map(users.map((u) => [u.user_id, u]));

  // Weekly scores per roster.
  const scores = new Map<number, Record<number, number>>();
  for (const r of rosters) scores.set(r.roster_id, {});
  for (const w of completedWeeks) {
    for (const m of matchupsByWeek[w] ?? []) {
      const s = scores.get(m.roster_id);
      if (s && m.points != null) s[w] = m.points;
    }
  }

  // Replay eliminations: lowest scorer among alive teams each completed week.
  // Ties broken by lower season points to date (Sleeper's actual tiebreak may differ).
  const eliminatedWeek = new Map<number, number>();
  const cutLines: Record<number, number> = {};
  const alive = new Set(rosters.map((r) => r.roster_id));
  for (const w of completedWeeks) {
    const contenders = [...alive].filter((id) => scores.get(id)?.[w] != null);
    if (contenders.length <= 1) break;
    const toDate = (id: number) =>
      Object.entries(scores.get(id)!)
        .filter(([wk]) => Number(wk) <= w)
        .reduce((a, [, p]) => a + p, 0);
    contenders.sort((a, b) => scores.get(a)![w] - scores.get(b)![w] || toDate(a) - toDate(b));
    const chopped = contenders[0];
    cutLines[w] = scores.get(chopped)![w];
    eliminatedWeek.set(chopped, w);
    alive.delete(chopped);
  }

  // Cross-check: a chopped team's players are released, so its roster should be empty.
  const emptyRosters = rosters.filter((r) => (r.players?.length ?? 0) === 0).map((r) => r.roster_id);
  if (emptyRosters.length > 0 && emptyRosters.length !== eliminatedWeek.size) {
    notes.push(
      `Score replay found ${eliminatedWeek.size} eliminations but ${emptyRosters.length} rosters are empty. ` +
        "Your league may chop more than one team per week or use a different tiebreak. Empty rosters are treated as eliminated.",
    );
    for (const id of emptyRosters) if (!eliminatedWeek.has(id)) eliminatedWeek.set(id, NaN);
    for (const [id] of eliminatedWeek) if (!emptyRosters.includes(id)) eliminatedWeek.delete(id);
  }

  const lastWeek = completedWeeks.length ? completedWeeks[completedWeeks.length - 1] : null;
  const live = new Map<number, number>();
  if (liveWeek != null) {
    for (const m of matchupsByWeek[liveWeek] ?? []) if (m.points != null) live.set(m.roster_id, m.points);
  }

  const teams: TeamRow[] = rosters.map((r) => {
    const user = r.owner_id ? userById.get(r.owner_id) : undefined;
    const weekly = scores.get(r.roster_id) ?? {};
    const elim = eliminatedWeek.get(r.roster_id);
    const isAlive = elim === undefined;
    const played = Object.values(weekly);
    const last = lastWeek != null ? weekly[lastWeek] ?? null : null;
    const seasonPoints = played.length
      ? played.reduce((a, b) => a + b, 0)
      : (r.settings.fpts ?? 0) + (r.settings.fpts_decimal ?? 0) / 100;
    return {
      rosterId: r.roster_id,
      ownerId: r.owner_id,
      teamName: user?.metadata?.team_name || user?.display_name || `Team ${r.roster_id}`,
      managerName: user?.display_name ?? "Unclaimed",
      alive: isAlive,
      eliminatedWeek: elim === undefined || Number.isNaN(elim) ? null : elim,
      faabRemaining: isAlive ? Math.max(0, faabBudget - (r.settings.waiver_budget_used ?? 0)) : 0,
      faabShare: 0,
      seasonPoints: round(seasonPoints),
      weeklyScores: weekly,
      lastWeekScore: last,
      lastWeekMargin:
        last != null && lastWeek != null && cutLines[lastWeek] != null && isAlive
          ? round(last - cutLines[lastWeek])
          : null,
      avgScore: played.length ? round(played.reduce((a, b) => a + b, 0) / played.length) : null,
      liveScore: isAlive ? live.get(r.roster_id) ?? null : null,
    };
  });

  const totalAliveFaab = teams.filter((t) => t.alive).reduce((a, t) => a + t.faabRemaining, 0);
  for (const t of teams) t.faabShare = totalAliveFaab ? t.faabRemaining / totalAliveFaab : 0;

  teams.sort((a, b) => {
    if (a.alive !== b.alive) return a.alive ? -1 : 1;
    if (!a.alive) return (b.eliminatedWeek ?? 0) - (a.eliminatedWeek ?? 0);
    return (
      (b.liveScore ?? -1) - (a.liveScore ?? -1) ||
      (b.lastWeekScore ?? -1) - (a.lastWeekScore ?? -1) ||
      b.seasonPoints - a.seasonPoints
    );
  });

  if (faabBudget === 0) notes.push("This league has no FAAB budget set, so FAAB columns read $0.");

  return {
    teams,
    aliveCount: teams.filter((t) => t.alive).length,
    faabBudget,
    totalAliveFaab,
    completedWeeks,
    liveWeek,
    lastCutLine: lastWeek != null ? cutLines[lastWeek] ?? null : null,
    notes,
  };
}
