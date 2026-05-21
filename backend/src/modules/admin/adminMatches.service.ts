// File: backend/src/modules/admin/adminMatches.service.ts
// Purpose: Business logic for the admin match endpoints.
// Functionality: Lists matches (optionally filtered by round), stores a
// match result and re-scores every prediction, and patches match metadata
// (schedule, counts-for round, status, administrative flag).
// Role: Called by `adminMatches.routes.ts`. Owns the integration with the
// scoring engine — every code path that could change a prediction's value
// re-runs `applyPredictionScoring`.

import type { Prisma } from '../../lib/db';
import { NotFoundError, ValidationError } from '../../lib/errors';
import { applyPredictionScoring } from '../scoring/scoring';
import type { MatchResultInput, UpdateMatchInput } from './adminMatches.schemas';

// Common select used by `listMatches` so the row shape stays consistent.
const matchSelect = {
  id: true,
  scheduledAt: true,
  kickoffAt: true,
  homeGoals: true,
  awayGoals: true,
  status: true,
  isKnockout: true,
  resolvedAdministratively: true,
  winnerByPenaltiesTeamId: true,
  homeTeam: { select: { id: true, nameEs: true, code: true, flagEmoji: true } },
  awayTeam: { select: { id: true, nameEs: true, code: true, flagEmoji: true } },
  round: { select: { id: true, name: true, orderIndex: true } },
  countsForRound: { select: { id: true, name: true, orderIndex: true } },
} as const;

// Lists matches optionally filtered by their original round.
// Inputs: prisma client and optional `roundId`. Output: matches ordered by
// scheduled time. Read-only.
export async function listMatches(prisma: Prisma, roundId?: number) {
  return prisma.match.findMany({
    where: roundId ? { roundId } : {},
    orderBy: { scheduledAt: 'asc' },
    select: matchSelect,
  });
}

// Stores the final result of a match and recomputes points for every
// attached prediction.
// Inputs: prisma client, match id, validated result payload.
// Output: none. Side effects: updates `Match`, mass-updates `Prediction`.
// Throws: `NotFoundError` if the match doesn't exist, `ValidationError`
// for shootout inputs that don't match the match metadata.
export async function setMatchResult(
  prisma: Prisma,
  matchId: number,
  input: MatchResultInput,
): Promise<void> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new NotFoundError('El partido no existe');

  // Coerce undefined to null so the DB always sees an explicit value when
  // the admin clears the field.
  const winner = input.winnerByPenaltiesTeamId ?? null;

  if (winner !== null) {
    if (winner !== match.homeTeamId && winner !== match.awayTeamId) {
      throw new ValidationError(
        'El equipo ganador por penales debe ser uno de los dos del partido',
      );
    }
    if (!match.isKnockout) {
      throw new ValidationError('Solo en eliminatorias se puede definir por penales');
    }
    if (input.homeGoals !== input.awayGoals) {
      throw new ValidationError(
        'Solo podés cargar ganador por penales si el partido terminó empatado en 120 minutos',
      );
    }
  }

  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeGoals: input.homeGoals,
      awayGoals: input.awayGoals,
      winnerByPenaltiesTeamId: winner,
      // Posting a result implicitly flips the status. The admin can still
      // override this through PATCH if they need to mark it postponed.
      status: 'finished',
    },
  });

  await applyPredictionScoring(prisma, matchId);
}

// Updates match metadata: reschedule, change the round that counts the
// match for the leaderboard (rule 4.5), change status or toggle the
// administrative-resolution flag (rule 4.6).
// Inputs: prisma client, match id, validated patch payload.
// Output: none. Side effects: updates `Match`; re-runs scoring when the
// `resolvedAdministratively` flag changes (so existing point values stay
// consistent).
export async function updateMatch(
  prisma: Prisma,
  matchId: number,
  input: UpdateMatchInput,
): Promise<void> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new NotFoundError('El partido no existe');

  if (input.countsForRoundId !== undefined) {
    const round = await prisma.tournamentRound.findUnique({
      where: { id: input.countsForRoundId },
    });
    if (!round) throw new ValidationError('La ronda destino no existe');
  }

  const previousAdminFlag = match.resolvedAdministratively;

  await prisma.match.update({
    where: { id: matchId },
    data: {
      ...(input.scheduledAt !== undefined && { scheduledAt: input.scheduledAt }),
      ...(input.countsForRoundId !== undefined && {
        countsForRoundId: input.countsForRoundId,
      }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.resolvedAdministratively !== undefined && {
        resolvedAdministratively: input.resolvedAdministratively,
      }),
    },
  });

  // If the admin flag flipped, recompute so the affected predictions are
  // zeroed (or restored, when flipping back to false with a stored score).
  if (
    input.resolvedAdministratively !== undefined &&
    input.resolvedAdministratively !== previousAdminFlag
  ) {
    await applyPredictionScoring(prisma, matchId);
  }
}
