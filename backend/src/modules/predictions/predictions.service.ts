// File: backend/src/modules/predictions/predictions.service.ts
// Purpose: Business logic behind the predictions endpoints.
// Functionality: Upserts a user's prediction for a match (applying lock
// and knockout-no-draw guards) and lists predictions for a given round
// alongside match metadata.
// Role: Called by `predictions.routes.ts`; never speaks HTTP directly.

import type { Prisma } from '../../lib/db';
import { NotFoundError, ValidationError } from '../../lib/errors';
import {
  assertPredictionEditable,
  isLockedForPredictions,
} from './predictions.guards';
import type { PredictionInput } from './predictions.schemas';

// Shape returned by `listPredictionsForRound`. Designed for direct
// consumption by the Predicciones screen.
export type MatchWithPrediction = {
  id: number;
  scheduledAt: Date;
  kickoffAt: Date | null;
  homeTeam: { id: number; nameEs: string; code: string; flagEmoji: string };
  awayTeam: { id: number; nameEs: string; code: string; flagEmoji: string };
  homeGoals: number | null;
  awayGoals: number | null;
  status: string;
  isKnockout: boolean;
  resolvedAdministratively: boolean;
  isLocked: boolean;
  prediction: { homeGoals: number; awayGoals: number } | null;
};

export type RoundSummary = {
  id: number;
  name: string;
  orderIndex: number;
  isKnockout: boolean;
};

export type ListPredictionsResult = {
  round: RoundSummary;
  matches: MatchWithPrediction[];
};

// Creates or updates the authenticated user's prediction for a match.
// Validates that the match exists, is not cancelled and is still editable
// (15 min lock — rule 4.2). Draws are allowed in every match, including
// knockouts (rule 4 — updated).
//
// Inputs: prisma client, user id, match id and validated prediction body.
// Side effects: upserts `Prediction`. Throws `NotFoundError` or
// `ValidationError` on rule violations.
export async function upsertPrediction(
  prisma: Prisma,
  userId: number,
  matchId: number,
  input: PredictionInput,
): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, scheduledAt: true, status: true },
  });
  if (!match) throw new NotFoundError('El partido no existe');
  if (match.status === 'cancelled') {
    throw new ValidationError('El partido fue cancelado');
  }

  assertPredictionEditable(match.scheduledAt);

  await prisma.prediction.upsert({
    where: { userId_matchId: { userId, matchId } },
    create: { userId, matchId, homeGoals: input.homeGoals, awayGoals: input.awayGoals },
    update: { homeGoals: input.homeGoals, awayGoals: input.awayGoals },
  });
}

// Lists every match of a round together with the user's prediction (if
// any). Used to populate the Predicciones and Fixture screens.
// Inputs: prisma client, user id, round id.
// Output: round summary + array of matches. Throws if the round is missing.
export async function listPredictionsForRound(
  prisma: Prisma,
  userId: number,
  roundId: number,
): Promise<ListPredictionsResult> {
  const round = await prisma.tournamentRound.findUnique({
    where: { id: roundId },
    select: { id: true, name: true, orderIndex: true, isKnockout: true },
  });
  if (!round) throw new NotFoundError('La ronda no existe');

  const matches = await prisma.match.findMany({
    where: { roundId },
    orderBy: { scheduledAt: 'asc' },
    include: {
      homeTeam: { select: { id: true, nameEs: true, code: true, flagEmoji: true } },
      awayTeam: { select: { id: true, nameEs: true, code: true, flagEmoji: true } },
      predictions: {
        where: { userId },
        select: { homeGoals: true, awayGoals: true },
      },
    },
  });

  const now = new Date();
  const rows: MatchWithPrediction[] = matches.map((m) => ({
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
    prediction: m.predictions[0] ?? null,
  }));

  return { round, matches: rows };
}
