// File: backend/src/modules/tournament/matchPredictions.service.ts
// Purpose: List every participant's prediction for a single match, used by
// the "predicciones del partido" modal opened from the Fixture screen.
// Functionality: Returns one row per active non-admin user with their
// forecast (and the points it earned once scored). Predictions are exposed
// ONLY once the match is locked — 15 minutes before kickoff (rule 4.2) —
// so forecasts cannot be leaked while predictions are still editable, even
// if the endpoint is hit directly. While locked-but-not-finished the rows
// are ordered by the player's current position in the global standings;
// once finished they are ordered by points DESC then name ASC.
// Role: Backs GET /api/tournament/match-predictions.

import type { Prisma } from '../../lib/db';
import { NotFoundError } from '../../lib/errors';
import { isLockedForPredictions } from '../predictions/predictions.guards';
import { getStandings } from './standings.service';

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
    // True once predictions are locked (15 min before kickoff). Rows are
    // revealed from this point on; before it the `rows` array is empty.
    isLocked: boolean;
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

// Returns every active non-admin participant's prediction for one match.
// Rows are revealed once the match is locked (15 min before kickoff); before
// that the `rows` array is empty so nothing leaks while predictions are still
// editable. Locked-but-not-finished rows are ordered by the player's current
// standings position; finished rows are ordered by points DESC then name ASC.
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
  const locked = isLockedForPredictions(match.scheduledAt);

  const summary = {
    id: match.id,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeGoals: match.homeGoals,
    awayGoals: match.awayGoals,
    isFinished: finished,
    isLocked: locked,
  };

  // Keep everything hidden until predictions are locked.
  if (!locked) return { match: summary, rows: [] };

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

  if (finished) {
    // Order: points DESC, then name ASC (Spanish locale, case/accent aware).
    rows.sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, 'es'));
  } else {
    // Pre-result: no points are awarded yet, so order by the player's current
    // position in the global standings (best-ranked first). Players missing
    // from the standings fall to the bottom, then alphabetical as a tie-break.
    const standings = await getStandings(prisma);
    const positionByUser = new Map(standings.map((s) => [s.userId, s.position]));
    rows.sort((a, b) => {
      const pa = positionByUser.get(a.userId) ?? Number.POSITIVE_INFINITY;
      const pb = positionByUser.get(b.userId) ?? Number.POSITIVE_INFINITY;
      return pa - pb || a.name.localeCompare(b.name, 'es');
    });
  }

  return { match: summary, rows };
}
