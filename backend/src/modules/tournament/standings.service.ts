// File: backend/src/modules/tournament/standings.service.ts
// Purpose: Compute the global users' leaderboard on demand.
// Functionality: Aggregates every active user's predictions, filtering by
// `match.countsForRound.orderIndex >= user.joinedRound.orderIndex` and
// excluding matches resolved administratively (rules 4.6 and 4.7), then
// assigns shared ranks per rule 4.8.
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
};

// Internal row before ranks are assigned.
type RawRow = {
  userId: number;
  name: string;
  totalPoints: number;
  exactCount: number;
};

// Assigns positions with shared ranks (rule 4.8). Users tied on points share
// the same position number; ties skip the next slot ("classic" RANK, not
// DENSE_RANK). Within a tie, rows are kept sorted by exactCount DESC for
// visual ordering, but their position is identical.
// Inputs: rows already sorted by points DESC, exactCount DESC.
// Output: same rows with a `position` field added.
function assignPositions(rows: RawRow[]): StandingsRow[] {
  const out: StandingsRow[] = [];
  let currentPosition = 0;
  let lastPoints: number | null = null;

  rows.forEach((row, idx) => {
    // `idx + 1` is the sequential rank; it becomes the new position only
    // when the point total changes. Ties keep `currentPosition`.
    if (row.totalPoints !== lastPoints) {
      currentPosition = idx + 1;
      lastPoints = row.totalPoints;
    }
    out.push({ position: currentPosition, ...row });
  });

  return out;
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
            select: { countsForRound: { select: { orderIndex: true } } },
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
    for (const pred of user.predictions) {
      if (pred.match.countsForRound.orderIndex < joinedOrder) continue;
      totalPoints += pred.pointsAwarded;
      if (pred.isExact) exactCount += 1;
    }

    return {
      userId: user.id,
      name: `${user.nombre} ${user.apellido}`.trim(),
      totalPoints,
      exactCount,
    };
  });

  // Primary sort: totalPoints DESC; tie-breaker: exactCount DESC.
  raw.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.exactCount !== a.exactCount) return b.exactCount - a.exactCount;
    return a.name.localeCompare(b.name, 'es-AR');
  });

  return assignPositions(raw);
}

// Exposed for unit testing. Wraps the pure ranking step so callers can hand
// in synthetic rows without touching the database.
export const __test = { assignPositions };
