// File: backend/src/modules/tournament/standings.service.ts
// Purpose: Compute the global users' leaderboard on demand.
// Functionality: Aggregates every active user's predictions, filtering by
// `match.countsForRound.orderIndex >= user.joinedRound.orderIndex` and
// excluding matches resolved administratively (rules 4.6 and 4.7), then
// assigns unique sequential positions per rule 8 — updated. Tie-breakers,
// in order: total points DESC, exact-count DESC, GD-hits DESC (number of
// predictions worth 5 or 7 points), winner-goals DESC (sum of the real
// winner team's goals in matches where the user picked the correct
// winner), name ASC (Spanish locale).
// Role: Backs the `/api/tournament/standings` endpoint.

import type { Prisma } from '../../lib/db';
import { cached, invalidate } from '../../lib/cache';

// Cache key + TTL for the global leaderboard. Five seconds is short
// enough that a freshly-posted result becomes visible almost immediately,
// yet long enough to collapse the 150-user post-match burst into a single
// underlying query.
const STANDINGS_CACHE_KEY = 'tournament:standings';
const STANDINGS_TTL_MS = 5_000;

// Called by admin write paths (set/clear/update match result) so the next
// /standings request rebuilds the leaderboard instead of serving stale data.
export function invalidateStandingsCache(): void {
  invalidate(STANDINGS_CACHE_KEY);
}

export type StandingsRow = {
  position: number;
  userId: number;
  name: string;
  totalPoints: number;
  exactCount: number;
  // Extra tie-break metrics, exposed so the frontend can display them if
  // it ever needs to surface the reason behind an ordering.
  gdHitCount: number;
  winnerGoals: number;
};

// Internal row before positions are assigned.
type RawRow = {
  userId: number;
  name: string;
  totalPoints: number;
  exactCount: number;
  gdHitCount: number;
  winnerGoals: number;
};

// Assigns unique sequential positions (rule 8 — updated). Even when the
// metric tuple ends up identical, positions remain 1, 2, 3, … so the
// table never shows shared rankings.
// Inputs: rows already sorted by the full tie-break tuple.
// Output: same rows with a `position` field added.
function assignPositions(rows: RawRow[]): StandingsRow[] {
  return rows.map((row, idx) => ({ position: idx + 1, ...row }));
}

// Computes the leaderboard for every active user.
// Inputs: prisma client. Output: rows sorted and ranked.
// Side effects: read-only. Memoized in process memory for STANDINGS_TTL_MS
// to absorb the post-match traffic spike — admin write paths must call
// `invalidateStandingsCache()` to publish fresh numbers immediately.
export function getStandings(prisma: Prisma): Promise<StandingsRow[]> {
  return cached(STANDINGS_CACHE_KEY, STANDINGS_TTL_MS, () =>
    computeStandings(prisma),
  );
}

// Pure computation extracted so the cached wrapper above stays trivial.
async function computeStandings(prisma: Prisma): Promise<StandingsRow[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true, isAdmin: false },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      joinedRound: { select: { orderIndex: true } },
      predictions: {
        where: { match: { resolvedAdministratively: false } },
        select: {
          pointsAwarded: true,
          isExact: true,
          match: {
            select: {
              homeGoals: true,
              awayGoals: true,
              homeTeamId: true,
              awayTeamId: true,
              countsForRound: { select: { orderIndex: true } },
            },
          },
        },
      },
    },
  });

  const raw: RawRow[] = users.map((user) => {
    // Users with no joinedRound yet (created before any round started)
    // accrue from round 1 onwards — represented as -Infinity here so every
    // round qualifies.
    const joinedOrder = user.joinedRound?.orderIndex ?? -Infinity;

    let totalPoints = 0;
    let exactCount = 0;
    let gdHitCount = 0;
    let winnerGoals = 0;
    for (const pred of user.predictions) {
      if (pred.match.countsForRound.orderIndex < joinedOrder) continue;
      totalPoints += pred.pointsAwarded;
      if (pred.isExact) exactCount += 1;
      // Predictions worth 5 or 7 points are the ones where the user nailed
      // the goal difference (rule 8 — updated, tie-break #2).
      if (pred.pointsAwarded === 5 || pred.pointsAwarded === 7) gdHitCount += 1;
      // Tie-break #3: sum of the real winning team's goals in matches the
      // user correctly tipped (i.e. earned ≥3 points). Draws contribute 0.
      if (pred.pointsAwarded >= 3) {
        const home = pred.match.homeGoals;
        const away = pred.match.awayGoals;
        if (home !== null && away !== null && home !== away) {
          winnerGoals += home > away ? home : away;
        }
      }
    }

    return {
      userId: user.id,
      name: `${user.nombre} ${user.apellido}`.trim(),
      totalPoints,
      exactCount,
      gdHitCount,
      winnerGoals,
    };
  });

  // Full tie-break tuple. Always falls back to the Spanish locale-aware
  // alphabetical order so two users with identical metrics still get a
  // deterministic position.
  raw.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactCount !== a.exactCount) return b.exactCount - a.exactCount;
    if (b.gdHitCount !== a.gdHitCount) return b.gdHitCount - a.gdHitCount;
    if (b.winnerGoals !== a.winnerGoals) return b.winnerGoals - a.winnerGoals;
    return a.name.localeCompare(b.name, 'es-AR');
  });

  return assignPositions(raw);
}

// ---------------------------------------------------------------------------
// By-team leaderboard (rule 9 — team prizes)
// ---------------------------------------------------------------------------

// Cache key + TTL for the by-team leaderboard. Same trade-off as the
// individual standings cache.
const TEAM_STANDINGS_CACHE_KEY = 'tournament:team-standings';
const TEAM_STANDINGS_TTL_MS = 5_000;

// Public types returned by `getTeamStandings`. `members` is the count of
// active users in the equipo (the denominator of the average).
export type TeamStandingsRow = {
  position: number;
  equipo: string;
  members: number;
  totalPoints: number;
  averagePoints: number;
};

export type TeamRoundStandings = {
  roundId: number;
  roundName: string;
  orderIndex: number;
  teams: TeamStandingsRow[];
};

export type TeamStandingsResult = {
  byRound: TeamRoundStandings[];
  total: TeamStandingsRow[];
};

// Called by admin write paths so the next /team-standings request rebuilds.
export function invalidateTeamStandingsCache(): void {
  invalidate(TEAM_STANDINGS_CACHE_KEY);
}

// Computes the by-team leaderboard, both broken down per round and as a
// total accumulator. The average for each equipo is `totalPoints / members`
// where `members` is the count of currently-active users assigned to it.
// Users without an equipo and admins are excluded entirely.
// Inputs: prisma client. Output: per-round and total tables.
// Side effects: read-only. Memoized for TEAM_STANDINGS_TTL_MS.
export function getTeamStandings(prisma: Prisma): Promise<TeamStandingsResult> {
  return cached(TEAM_STANDINGS_CACHE_KEY, TEAM_STANDINGS_TTL_MS, () =>
    computeTeamStandings(prisma),
  );
}

async function computeTeamStandings(prisma: Prisma): Promise<TeamStandingsResult> {
  const [users, rounds] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true, isAdmin: false, equipo: { not: null } },
      select: {
        id: true,
        equipo: true,
        joinedRound: { select: { orderIndex: true } },
        predictions: {
          where: { match: { resolvedAdministratively: false } },
          select: {
            pointsAwarded: true,
            match: {
              select: {
                countsForRound: { select: { id: true, orderIndex: true } },
              },
            },
          },
        },
      },
    }),
    prisma.tournamentRound.findMany({
      orderBy: { orderIndex: 'asc' },
      select: { id: true, name: true, orderIndex: true },
    }),
  ]);

  // Members per equipo — the denominator of every average for that equipo,
  // regardless of round (the denominator is constant: it reflects current
  // active membership, not who had submitted predictions yet).
  const membersByEquipo = new Map<string, number>();
  for (const u of users) {
    const e = u.equipo;
    if (!e) continue;
    membersByEquipo.set(e, (membersByEquipo.get(e) ?? 0) + 1);
  }

  // Aggregate points: total per (round, equipo) and grand total per equipo.
  // `joinedRound` filtering matches the individual leaderboard so a user
  // who joined mid-tournament does not contribute earlier rounds.
  const totalByEquipo = new Map<string, number>();
  // Outer key: roundId; inner key: equipo. Avoids string concatenation keys.
  const byRound = new Map<number, Map<string, number>>();
  for (const u of users) {
    const equipo = u.equipo;
    if (!equipo) continue;
    const joinedOrder = u.joinedRound?.orderIndex ?? -Infinity;
    for (const pred of u.predictions) {
      const round = pred.match.countsForRound;
      if (round.orderIndex < joinedOrder) continue;
      totalByEquipo.set(equipo, (totalByEquipo.get(equipo) ?? 0) + pred.pointsAwarded);
      const inner = byRound.get(round.id) ?? new Map<string, number>();
      inner.set(equipo, (inner.get(equipo) ?? 0) + pred.pointsAwarded);
      byRound.set(round.id, inner);
    }
  }

  // Builds a sorted, ranked TeamStandingsRow[] for the given (equipo →
  // points) map. Equipos with no points still appear (so the admin can see
  // 0-point teams in early rounds).
  function buildRows(pointsByEquipo: Map<string, number>): TeamStandingsRow[] {
    const rows: Omit<TeamStandingsRow, 'position'>[] = [];
    for (const [equipo, members] of membersByEquipo) {
      const totalPoints = pointsByEquipo.get(equipo) ?? 0;
      const averagePoints = members === 0 ? 0 : totalPoints / members;
      rows.push({ equipo, members, totalPoints, averagePoints });
    }
    rows.sort((a, b) => {
      if (b.averagePoints !== a.averagePoints) return b.averagePoints - a.averagePoints;
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return a.equipo.localeCompare(b.equipo, 'es-AR');
    });
    return rows.map((r, idx) => ({ position: idx + 1, ...r }));
  }

  const byRoundResult: TeamRoundStandings[] = rounds.map((r) => ({
    roundId: r.id,
    roundName: r.name,
    orderIndex: r.orderIndex,
    teams: buildRows(byRound.get(r.id) ?? new Map()),
  }));

  const totalResult = buildRows(totalByEquipo);

  return { byRound: byRoundResult, total: totalResult };
}

// Exposed for unit testing. Wraps the pure ranking step so callers can hand
// in synthetic rows without touching the database.
export const __test = { assignPositions };
