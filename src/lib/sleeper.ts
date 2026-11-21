import { cacheLife } from "next/cache";

// Sleeper public API: read-only, no auth. Docs: https://docs.sleeper.com
const BASE = process.env.SLEEPER_API_BASE ?? "https://api.sleeper.app/v1";

export type SleeperUser = {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
};

export type SleeperLeague = {
  league_id: string;
  name: string;
  season: string;
  status: string; // pre_draft | drafting | in_season | complete
  total_rosters: number;
  avatar: string | null;
  settings: Record<string, number | string | null | undefined>;
};

export type SleeperRoster = {
  roster_id: number;
  owner_id: string | null;
  players: string[] | null;
  starters: string[] | null;
  settings: {
    wins?: number;
    losses?: number;
    fpts?: number;
    fpts_decimal?: number;
    waiver_budget_used?: number;
    waiver_position?: number;
  };
};

export type SleeperLeagueUser = {
  user_id: string;
  display_name: string;
  avatar: string | null;
  metadata?: { team_name?: string };
};

export type SleeperMatchup = {
  roster_id: number;
  matchup_id: number | null;
  points: number | null;
};

export type NflState = {
  season: string;
  season_type: string;
  week: number;
  display_week?: number;
};

async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  // Sleeper returns a literal `null` body for unknown users/leagues.
  return (await res.json()) as T | null;
}

export async function getNflState(): Promise<NflState | null> {
  "use cache";
  cacheLife("hours");
  return get<NflState>("/state/nfl");
}

export async function getUser(username: string): Promise<SleeperUser | null> {
  "use cache";
  cacheLife("days");
  return get<SleeperUser>(`/user/${encodeURIComponent(username.trim())}`);
}

export async function getUserLeagues(
  userId: string,
  season: string,
): Promise<SleeperLeague[]> {
  "use cache";
  cacheLife("hours");
  return (await get<SleeperLeague[]>(`/user/${userId}/leagues/nfl/${season}`)) ?? [];
}

export async function getLeague(leagueId: string): Promise<SleeperLeague | null> {
  "use cache";
  cacheLife("minutes");
  return get<SleeperLeague>(`/league/${leagueId}`);
}

export async function getRosters(leagueId: string): Promise<SleeperRoster[]> {
  "use cache";
  cacheLife("minutes");
  return (await get<SleeperRoster[]>(`/league/${leagueId}/rosters`)) ?? [];
}

export async function getLeagueUsers(leagueId: string): Promise<SleeperLeagueUser[]> {
  "use cache";
  cacheLife("hours");
  return (await get<SleeperLeagueUser[]>(`/league/${leagueId}/users`)) ?? [];
}

export async function getMatchups(
  leagueId: string,
  week: number,
): Promise<SleeperMatchup[]> {
  "use cache";
  cacheLife("minutes");
  return (await get<SleeperMatchup[]>(`/league/${leagueId}/matchups/${week}`)) ?? [];
}
