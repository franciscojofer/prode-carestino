// File: backend/src/modules/tournament/userHistory.service.ts
// Purpose: Build one player's per-round prediction history for the public
// "historial de puntos" modal opened from the leaderboard.
// Functionality: For a given user and round, returns every match of the
// round with its official result, the player's prediction and the points
// that prediction earned. The prediction and points are revealed ONLY for
// matches that have already finished, so pending forecasts stay private
// even if the endpoint is hit directly.
// Role: Backs GET /api/tournament/user-history.

import type { Prisma } from '../../lib/db';
import { NotFoundError } from '../../lib/errors';

// Team shape embedded in each history row.
type HistoryTeam = { id: number; nameEs: string; code: string; flagEmoji: string };

// One match in the player's round history. `prediction` and `points` are
// null until the match is finished (see `isFinished`).
export type UserHistoryMatch = {
  id: number;
  scheduledAt: Date;
  homeTeam: HistoryTeam;
  awayTeam: HistoryTeam;
  status: string;
  // Official score — null until the admin posts the result.
  homeGoals: number | null;
  awayGoals: number | null;
  // True once the official result is loaded; gates the reveal below.
  isFinished: boolean;
  // Player's forecast, revealed only when the match finished. Null means
  // either "not finished yet" or "the player did not predict this match".
  prediction: { homeGoals: number; awayGoals: number } | null;
  // Points the forecast earned, revealed only when the match finished.
  points: number | null;
  isExact: boolean;
};

export type UserRoundHistory = {
  user: { id: number; name: string };
  round: { id: number; name: string; orderIndex: number; isKnockout: boolean };
  matches: UserHistoryMatch[];
};

// A match counts as finished once it is marked `finished` and both goal
// columns are populated. Mirrors the criterion already used by the Fixture
// screen so reveal behaviour is consistent across the app.
function isMatchFinished(
  status: string,
  homeGoals: number | null,
  awayGoals: number | null,
): boolean {
  return status === 'finished' && homeGoals !== null && awayGoals !== null;
}

// Returns the chosen player's predictions for one round, joined with each
// match's official result and the points awarded.
// Inputs: prisma client, target user id, round id.
// Output: user summary + round summary + per-match rows. Throws
// `NotFoundError` when the user or the round does not exist.
export async function getUserRoundHistory(
  prisma: Prisma,
  userId: number,
  roundId: number,
): Promise<UserRoundHistory> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nombre: true, apellido: true },
  });
  if (!user) throw new NotFoundError('El usuario no existe');

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
        select: { homeGoals: true, awayGoals: true, pointsAwarded: true, isExact: true },
      },
    },
  });

  const rows: UserHistoryMatch[] = matches.map((m) => {
    const finished = isMatchFinished(m.status, m.homeGoals, m.awayGoals);
    const pred = m.predictions[0] ?? null;
    return {
      id: m.id,
      scheduledAt: m.scheduledAt,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      status: m.status,
      homeGoals: m.homeGoals,
      awayGoals: m.awayGoals,
      isFinished: finished,
      // Reveal the forecast and its points only after the match finished.
      prediction:
        finished && pred ? { homeGoals: pred.homeGoals, awayGoals: pred.awayGoals } : null,
      points: finished && pred ? pred.pointsAwarded : null,
      isExact: finished && pred ? pred.isExact : false,
    };
  });

  return {
    user: { id: user.id, name: `${user.nombre} ${user.apellido}` },
    round,
    matches: rows,
  };
}
