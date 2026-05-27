// File: backend/src/modules/tournament/tournament.routes.ts
// Purpose: Authenticated read endpoints exposing tournament state.
// Functionality: Returns the active round, the list of rounds, the live
// groups table, a round's fixture and the global standings.
// Role: Mounted under `/api/tournament` from `src/index.ts`. Consumed by
// the Torneo and Estadísticas screens.

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getActiveRound } from './tournament.queries';
import { getGroupsTable } from './groupsTable.service';
import { getStandings } from './standings.service';
import { isLockedForPredictions } from '../predictions/predictions.guards';
import { NotFoundError } from '../../lib/errors';
import { cached, invalidate } from '../../lib/cache';

// Cache keys + TTLs for the small, near-immutable read endpoints. Rounds
// and the active round only change when the admin edits them, so a longer
// TTL is safe. Both are dropped explicitly by the admin write paths.
const ROUNDS_CACHE_KEY = 'tournament:rounds';
const ROUNDS_TTL_MS = 30_000;
const CURRENT_ROUND_CACHE_KEY = 'tournament:current-round';
const CURRENT_ROUND_TTL_MS = 10_000;

// Exposed for the admin write paths so they can publish edits immediately.
export function invalidateRoundsCache(): void {
  invalidate(ROUNDS_CACHE_KEY);
  invalidate(CURRENT_ROUND_CACHE_KEY);
}

// Query params for the fixture endpoint.
const fixtureQuerySchema = z.object({
  roundId: z.coerce.number().int().positive(),
});

export async function tournamentRoutes(app: FastifyInstance) {
  // GET /current-round — the round predictions are currently open for.
  app.get('/current-round', { onRequest: [app.requireAuth] }, async () => {
    const round = await cached(CURRENT_ROUND_CACHE_KEY, CURRENT_ROUND_TTL_MS, () =>
      getActiveRound(app.prisma),
    );
    return { round };
  });

  // GET /rounds — ordered list of every round in the tournament.
  app.get('/rounds', { onRequest: [app.requireAuth] }, async () => {
    const rounds = await cached(ROUNDS_CACHE_KEY, ROUNDS_TTL_MS, () =>
      app.prisma.tournamentRound.findMany({
        orderBy: { orderIndex: 'asc' },
        select: {
          id: true,
          name: true,
          orderIndex: true,
          startsAt: true,
          endsAt: true,
          isKnockout: true,
        },
      }),
    );
    return { rounds };
  });

  // GET /groups — every group with its live table.
  app.get('/groups', { onRequest: [app.requireAuth] }, async () => {
    const groups = await getGroupsTable(app.prisma);
    return { groups };
  });

  // GET /fixture?roundId=N — matches of a given round with team data and
  // the current authenticated user's prediction, if any.
  app.get('/fixture', { onRequest: [app.requireAuth] }, async (req) => {
    const { roundId } = fixtureQuerySchema.parse(req.query);
    const round = await app.prisma.tournamentRound.findUnique({
      where: { id: roundId },
      select: { id: true, name: true, orderIndex: true, isKnockout: true },
    });
    if (!round) throw new NotFoundError('La ronda no existe');

    const matches = await app.prisma.match.findMany({
      where: { roundId },
      orderBy: { scheduledAt: 'asc' },
      include: {
        homeTeam: { select: { id: true, nameEs: true, code: true, flagEmoji: true } },
        awayTeam: { select: { id: true, nameEs: true, code: true, flagEmoji: true } },
        predictions: {
          where: { userId: req.user.userId },
          select: { homeGoals: true, awayGoals: true },
        },
      },
    });

    const now = new Date();
    return {
      round,
      matches: matches.map((m) => ({
        id: m.id,
        scheduledAt: m.scheduledAt,
        kickoffAt: m.kickoffAt,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
        homeGoals: m.homeGoals,
        awayGoals: m.awayGoals,
        status: m.status,
        isKnockout: m.isKnockout,
        resolvedAdministratively: m.resolvedAdministratively,
        isLocked: isLockedForPredictions(m.scheduledAt, now),
        // `prediction` is `null` when the user did not submit one for this
        // match; otherwise the goal numbers.
        prediction: m.predictions[0] ?? null,
      })),
    };
  });

  // GET /standings — global leaderboard with shared ranks (rule 4.8).
  app.get('/standings', { onRequest: [app.requireAuth] }, async () => {
    const standings = await getStandings(app.prisma);
    return { standings };
  });
}
