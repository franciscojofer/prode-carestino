// File: backend/src/modules/scoring/scoring.ts
// Purpose: Pure scoring engine for predictions.
// Functionality: Given a prediction and the real result, computes the points
// awarded according to the rules in section 4.1 of the product spec, plus
// the knockout-by-penalties exception. No database access — everything is
// passed by argument so the function is trivially testable.
// Role: Called by `applyPredictionScoring` (DB-aware wrapper) on every
// admin update of a match result, and by the recalculation routine.

import type { Prisma } from '../../lib/db';

// Result of scoring one prediction. The point values are constrained at the
// type level to make accidental mistakes easier to spot in reviews.
export type ScoreResult = {
  points: 0 | 3 | 5 | 7;
  isExact: boolean;
};

// Inputs for `calculatePoints`. All numeric fields are non-negative integers
// (goals) and the team ids reference the home/away of the same match so the
// penalties exception can identify which side won the shootout.
export type CalculatePointsInput = {
  predHome: number;
  predAway: number;
  realHome: number;
  realAway: number;
  isKnockout: boolean;
  // Present only when a knockout match was tied at 120 min and decided on
  // penalties. Holds the id of the team that won the shootout.
  winnerByPenaltiesTeamId: number | null;
  homeTeamId: number;
  awayTeamId: number;
};

// Computes the points for a single prediction.
//
// Rules summary:
//  - Exact score → 7 points.
//  - Same winner AND same goal difference → 5 points.
//  - Same winner only → 3 points.
//  - Otherwise → 0 points.
//
// Knockout exception (4.1): if a knockout match was tied at 120 min and a
// `winnerByPenaltiesTeamId` is provided, anyone who picked that team to win
// gets 3 points. Exact-score still applies (so a defensive 1-1 prediction
// that somehow slipped past validation can still earn 7).
//
// Inputs: see `CalculatePointsInput`. Output: `ScoreResult` with points and
// whether the prediction was exact. Pure — no side effects.
export function calculatePoints(input: CalculatePointsInput): ScoreResult {
  const {
    predHome,
    predAway,
    realHome,
    realAway,
    isKnockout,
    winnerByPenaltiesTeamId,
    homeTeamId,
    awayTeamId,
  } = input;

  // Exact-score check first; it dominates every other rule.
  if (predHome === realHome && predAway === realAway) {
    return { points: 7, isExact: true };
  }

  // Knockout decided on penalties. The "real winner" by points is the draw
  // in 120 min, but the spec carves out a 3-point reward for guessing the
  // shootout winner.
  if (isKnockout && realHome === realAway && winnerByPenaltiesTeamId !== null) {
    // A draw prediction shouldn't slip through (rule 4.3 blocks it both in
    // backend and frontend), but defensively: an empate awards 0.
    if (predHome === predAway) {
      return { points: 0, isExact: false };
    }
    const predictedWinnerId = predHome > predAway ? homeTeamId : awayTeamId;
    return predictedWinnerId === winnerByPenaltiesTeamId
      ? { points: 3, isExact: false }
      : { points: 0, isExact: false };
  }

  // General path (group stage, plus knockouts that ended in regulation).
  const realDiff = realHome - realAway;
  const predDiff = predHome - predAway;
  const realWinner = Math.sign(realDiff);
  const predWinner = Math.sign(predDiff);

  if (predWinner === realWinner && predDiff === realDiff) {
    return { points: 5, isExact: false };
  }
  if (predWinner === realWinner) {
    return { points: 3, isExact: false };
  }
  return { points: 0, isExact: false };
}

// Recomputes and persists scoring for every prediction attached to a match.
// Rules applied:
//  - If the match is `resolvedAdministratively` or the score is missing,
//    every prediction is zeroed (rule 4.6).
//  - Otherwise each prediction is re-evaluated with `calculatePoints` and
//    written back.
// Inputs: prisma client and match id. Output: number of predictions updated.
// Side effects: bulk-updates `Prediction.pointsAwarded` and `isExact`.
export async function applyPredictionScoring(prisma: Prisma, matchId: number): Promise<number> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { predictions: true },
  });
  if (!match) return 0;

  const shouldZero =
    match.resolvedAdministratively || match.homeGoals === null || match.awayGoals === null;

  if (shouldZero) {
    const result = await prisma.prediction.updateMany({
      where: { matchId },
      data: { pointsAwarded: 0, isExact: false },
    });
    return result.count;
  }

  // Process predictions sequentially. Volume is tiny (≤100 users per match)
  // so a transaction-per-batch would add complexity without measurable gain.
  let updated = 0;
  for (const pred of match.predictions) {
    const { points, isExact } = calculatePoints({
      predHome: pred.homeGoals,
      predAway: pred.awayGoals,
      realHome: match.homeGoals!,
      realAway: match.awayGoals!,
      isKnockout: match.isKnockout,
      winnerByPenaltiesTeamId: match.winnerByPenaltiesTeamId,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
    });
    await prisma.prediction.update({
      where: { id: pred.id },
      data: { pointsAwarded: points, isExact },
    });
    updated += 1;
  }
  return updated;
}
