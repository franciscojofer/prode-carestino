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

// A single equipo member with the points they contribute within the scope
// (a given round or the overall total). Surfaced so the frontend can expand
// a team row and show who makes up its total.
export type TeamMember = {
  userId: number;
  name: string;
  points: number;
};

// Public types returned by `getTeamStandings`. `members` is the count of
// active users in the equipo (the denominator of the average); `roster` is
// the per-member breakdown of `totalPoints`, sorted highest-first.
export type TeamStandingsRow = {
  position: number;
  equipo: string;
  members: number;
  totalPoints: number;
  averagePoints: number;
  roster: TeamMember[];
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
        nombre: true,
        apellido: true,
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

  // Per-user metadata (display name + equipo) used to build each team's
  // roster, plus the members-per-equipo count that is the denominator of
  // every average (constant across rounds: it reflects current active
  // membership, not who had submitted predictions yet).
  const userInfo = new Map<number, { name: string; equipo: string }>();
  const membersByEquipo = new Map<string, number>();
  for (const u of users) {
    const e = u.equipo;
    if (!e) continue;
    membersByEquipo.set(e, (membersByEquipo.get(e) ?? 0) + 1);
    userInfo.set(u.id, { name: `${u.nombre} ${u.apellido}`.trim(), equipo: e });
  }

  // Aggregate points per user: grand total and per-round. Team totals are
  // derived from these so the per-member roster always sums to the team's
  // total. `joinedRound` filtering matches the individual leaderboard so a
  // user who joined mid-tournament does not contribute earlier rounds.
  const totalByUser = new Map<number, number>();
  // Outer key: roundId; inner key: userId.
  const byRoundByUser = new Map<number, Map<number, number>>();
  for (const u of users) {
    if (!u.equipo) continue;
    const joinedOrder = u.joinedRound?.orderIndex ?? -Infinity;
    for (const pred of u.predictions) {
      const round = pred.match.countsForRound;
      if (round.orderIndex < joinedOrder) continue;
      totalByUser.set(u.id, (totalByUser.get(u.id) ?? 0) + pred.pointsAwarded);
      const inner = byRoundByUser.get(round.id) ?? new Map<number, number>();
      inner.set(u.id, (inner.get(u.id) ?? 0) + pred.pointsAwarded);
      byRoundByUser.set(round.id, inner);
    }
  }

  // Builds a sorted, ranked TeamStandingsRow[] for the given (userId →
  // points) map. Every active member appears in the roster (0 points if they
  // contributed nothing in scope), and equipos with no points still appear
  // (so the admin can see 0-point teams in early rounds).
  function buildRows(pointsByUser: Map<number, number>): TeamStandingsRow[] {
    // Group members under their equipo, carrying their in-scope points.
    const rosterByEquipo = new Map<string, TeamMember[]>();
    for (const [userId, info] of userInfo) {
      const list = rosterByEquipo.get(info.equipo) ?? [];
      list.push({ userId, name: info.name, points: pointsByUser.get(userId) ?? 0 });
      rosterByEquipo.set(info.equipo, list);
    }

    const rows: Omit<TeamStandingsRow, 'position'>[] = [];
    for (const [equipo, members] of membersByEquipo) {
      const roster = (rosterByEquipo.get(equipo) ?? []).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        return a.name.localeCompare(b.name, 'es-AR');
      });
      const totalPoints = roster.reduce((sum, m) => sum + m.points, 0);
      const averagePoints = members === 0 ? 0 : totalPoints / members;
      rows.push({ equipo, members, totalPoints, averagePoints, roster });
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
    teams: buildRows(byRoundByUser.get(r.id) ?? new Map()),
  }));

  const totalResult = buildRows(totalByUser);

  return { byRound: byRoundResult, total: totalResult };
}

// Exposed for unit testing. Wraps the pure ranking step so callers can hand
// in synthetic rows without touching the database.
export const __test = { assignPositions };
