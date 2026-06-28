// File: backend/src/modules/tournament/bracket.service.ts
// Purpose: Expose the knockout bracket (eliminatorias) for the Estadísticas
// "Llaves" view.
// Functionality: Returns every knockout round (isKnockout = true) ordered by
// orderIndex, each with its matches — teams (or the "Por definir" placeholder
// plus the FIFA slot label when the pairing isn't decided yet), the score and
// the penalty-shootout winner when applicable.
// Role: Backs GET /api/tournament/bracket. Read-only; memoized like the other
// tournament read endpoints to absorb post-result traffic.

import type { Prisma } from '../../lib/db';
import { cached, invalidate } from '../../lib/cache';

// Cache key + TTL for the bracket. Same short TTL as standings/groups so a
// freshly-posted knockout result surfaces almost immediately.
const BRACKET_CACHE_KEY = 'tournament:bracket';
const BRACKET_TTL_MS = 5_000;

// Called by admin write paths whenever a knockout score or pairing may have
// changed so the next /bracket request rebuilds the tree.
export function invalidateBracketCache(): void {
  invalidate(BRACKET_CACHE_KEY);
}

// Team shape embedded in each side of a bracket match.
type BracketTeam = { id: number; nameEs: string; code: string; flagEmoji: string };

// One knockout match. `placeholderLabel` holds the FIFA slot text
// ("W89 vs W90") used by the UI when the teams are still the TBD placeholder.
export type BracketMatch = {
  id: number;
  scheduledAt: Date;
  homeTeam: BracketTeam;
  awayTeam: BracketTeam;
  homeGoals: number | null;
  awayGoals: number | null;
  status: string;
  placeholderLabel: string | null;
  winnerByPenaltiesTeamId: number | null;
};

export type BracketRound = {
  id: number;
  name: string;
  orderIndex: number;
  matches: BracketMatch[];
};

export type BracketResult = { rounds: BracketRound[] };

// Returns the knockout bracket. Memoized in process memory for BRACKET_TTL_MS;
// admin write paths must call `invalidateBracketCache()` to publish changes.
// Inputs: prisma client. Output: ordered rounds with their matches.
export function getBracket(prisma: Prisma): Promise<BracketResult> {
  return cached(BRACKET_CACHE_KEY, BRACKET_TTL_MS, () => computeBracket(prisma));
}

async function computeBracket(prisma: Prisma): Promise<BracketResult> {
  const rounds = await prisma.tournamentRound.findMany({
    where: { isKnockout: true },
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true,
      name: true,
      orderIndex: true,
      matches: {
        orderBy: { scheduledAt: 'asc' },
        select: {
          id: true,
          scheduledAt: true,
          homeGoals: true,
          awayGoals: true,
          status: true,
          placeholderLabel: true,
          winnerByPenaltiesTeamId: true,
          homeTeam: { select: { id: true, nameEs: true, code: true, flagEmoji: true } },
          awayTeam: { select: { id: true, nameEs: true, code: true, flagEmoji: true } },
        },
      },
    },
  });

  return {
    rounds: rounds.map((r) => ({
      id: r.id,
      name: r.name,
      orderIndex: r.orderIndex,
      matches: r.matches.map((m) => ({
        id: m.id,
        scheduledAt: m.scheduledAt,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeGoals: m.homeGoals,
        awayGoals: m.awayGoals,
        status: m.status,
        placeholderLabel: m.placeholderLabel,
        winnerByPenaltiesTeamId: m.winnerByPenaltiesTeamId,
      })),
    })),
  };
}
