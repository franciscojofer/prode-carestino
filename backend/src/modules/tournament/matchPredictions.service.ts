// File: backend/src/modules/tournament/matchPredictions.service.ts
// Purpose: List every participant's prediction for a single match, used by
// the "predicciones del partido" modal opened from the Fixture screen.
// Functionality: For a finished match, returns one row per active
// non-admin user with their forecast and the points it earned, ordered by
// points DESC then name ASC. Predictions are exposed ONLY once the match
// has finished, so forecasts cannot be leaked before kickoff even if the
// endpoint is hit directly.
// Role: Backs GET /api/tournament/match-predictions.

import type { Prisma } from '../../lib/db';
import { NotFoundError } from '../../lib/errors';

// Team shape embedded in the match summary.
type PredTeam = { id: number; nameEs: string; code: string; flagEmoji: string };

// One participant row. `prediction` is null when the user did not forecast
// this match; `points` is 0 in that case.
export type MatchPredictionRow = {
  userId: number;
  name: string;
  prediction: { homeGoals: number; awayGoals: number } | null;
  points: number;
  isExact: boolean;
};

export type MatchPredictionsResult = {
  match: {
    id: number;
    homeTeam: PredTeam;
    awayTeam: PredTeam;
    homeGoals: number | null;
    awayGoals: number | null;
    isFinished: boolean;
  };
  rows: MatchPredictionRow[];
};

// A match is finished once it is marked `finished` with both goal columns
// populated. Mirrors the criterion used elsewhere in the app.
function isMatchFinished(
  status: string,
  homeGoals: number | null,
  awayGoals: number | null,
): boolean {
  return status === 'finished' && homeGoals !== null && awayGoals !== null;
}

// Returns every active non-admin participant's prediction for one match,
// ordered by points DESC then name ASC. When the match has not finished the
// `rows` array is empty and `isFinished` is false — nothing is revealed.
// Inputs: prisma client, match id.
// Output: match summary + participant rows. Throws `NotFoundError` when the
// match does not exist.
export async function getMatchPredictions(
  prisma: Prisma,
  matchId: number,
): Promise<MatchPredictionsResult> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: { select: { id: true, nameEs: true, code: true, flagEmoji: true } },
      awayTeam: { select: { id: true, nameEs: true, code: true, flagEmoji: true } },
    },
  });
  if (!match) throw new NotFoundError('El partido no existe');

  const finished = isMatchFinished(match.status, match.homeGoals, match.awayGoals);

  const summary = {
    id: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeGoals: match.homeGoals,
    awayGoals: match.awayGoals,
    isFinished: finished,
  };

  // Hide everything until the match finishes.
  if (!finished) return { match: summary, rows: [] };

  // Every participant (active, non-admin) joined with their prediction for
  // this match, if any.
  const users = await prisma.user.findMany({
    where: { isAdmin: false, isActive: true },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      predictions: {
        where: { matchId },
        select: { homeGoals: true, awayGoals: true, pointsAwarded: true, isExact: true },
      },
    },
  });

  const rows: MatchPredictionRow[] = users.map((u) => {
    const pred = u.predictions[0] ?? null;
    return {
      userId: u.id,
      name: `${u.nombre} ${u.apellido}`,
      prediction: pred ? { homeGoals: pred.homeGoals, awayGoals: pred.awayGoals } : null,
      points: pred?.pointsAwarded ?? 0,
      isExact: pred?.isExact ?? false,
    };
  });

  // Order: points DESC, then name ASC (Spanish locale, case/accent aware).
  rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'es'));

  return { match: summary, rows };
}
