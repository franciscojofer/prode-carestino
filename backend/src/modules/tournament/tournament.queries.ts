// File: backend/src/modules/tournament/tournament.queries.ts
// Purpose: Read-side helpers for tournament rounds.
// Functionality: Resolves the "active" round (the one whose predictions are
// open right now) and exposes a small `getActiveRound` that callers across
// the app share.
// Role: Used by predictions and tournament routes to anchor every "current"
// query to a single round.

import type { Prisma } from '../../lib/db';

// Round shape returned to the API. Kept narrow so the frontend doesn't
// receive fields it does not need (matches are fetched separately).
export type ActiveRound = {
  id: number;
  name: string;
  orderIndex: number;
  startsAt: Date;
  endsAt: Date | null;
  isKnockout: boolean;
};

// Resolves the active tournament round using this preference order:
//  1. The round that is currently in progress
//     (startsAt ≤ now AND (endsAt is null OR endsAt ≥ now)). Highest
//     orderIndex wins if more than one matches — overlapping rounds aren't
//     expected but we pick the latest to be deterministic.
//  2. Otherwise, the next round whose startsAt is in the future.
//  3. Otherwise (tournament finished), the last round by orderIndex.
//  4. `null` if the database has no rounds at all (uninitialised DB).
//
// Inputs: prisma client and optional `now`. Output: the round or null.
export async function getActiveRound(
  prisma: Prisma,
  now: Date = new Date(),
): Promise<ActiveRound | null> {
  const current = await prisma.tournamentRound.findFirst({
    where: {
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gte: now } }],
    },
    orderBy: { orderIndex: 'desc' },
    select: {
      id: true,
      name: true,
      orderIndex: true,
      startsAt: true,
      endsAt: true,
      isKnockout: true,
    },
  });
  if (current) return current;

  const upcoming = await prisma.tournamentRound.findFirst({
    where: { startsAt: { gt: now } },
    orderBy: { startsAt: 'asc' },
    select: {
      id: true,
      name: true,
      orderIndex: true,
      startsAt: true,
      endsAt: true,
      isKnockout: true,
    },
  });
  if (upcoming) return upcoming;

  return prisma.tournamentRound.findFirst({
    orderBy: { orderIndex: 'desc' },
    select: {
      id: true,
      name: true,
      orderIndex: true,
      startsAt: true,
      endsAt: true,
      isKnockout: true,
    },
  });
}
