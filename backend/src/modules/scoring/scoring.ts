// File: backend/src/modules/scoring/scoring.ts
// Purpose: Pure scoring engine for predictions.
// Functionality: Given a prediction and the real result, computes the points
// awarded according to the rules in section 4.1 of the product spec. The
// scoring is identical for group stage and knockout matches: the result
// considered is the score at minute 120 — penalty shootouts do NOT change
// the scoring outcome. No database access — everything is passed by
// argument so the function is trivially testable.
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
// (goals at minute 120). The `isKnockout` flag is kept for callers that
// still pass it but no longer changes the scoring outcome — playoffs use
// the same rules as the group stage and draws are now allowed.
export type CalculatePointsInput = {
  predHome: number;
  predAway: number;
  realHome: number;
  realAway: number;
  isKnockout: boolean;
};

// Computes the points for a single prediction.
//
// Rules summary (uniform for group stage and knockouts):
//  - Exact score → 7 points.
//  - Same winner AND same goal difference → 5 points.
//  - Same winner only → 3 points.
//  - Otherwise → 0 points.
//
// Both `realHome`/`realAway` and `predHome`/`predAway` correspond to the
// score at minute 120. Penalty shootouts are informational only and do
// not influence the scoring result (rule 4 — updated).
//
// Inputs: see `CalculatePointsInput`. Output: `ScoreResult` with points and
// whether the prediction was exact. Pure — no side effects.
export function calculatePoints(input: CalculatePointsInput): ScoreResult {
  const { predHome, predAway, realHome, realAway } = input;

  // Exact-score check first; it dominates every other rule.
  if (predHome === realHome && predAway === realAway) {
    return { points: 7, isExact: true };
  }

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
    });
    await prisma.prediction.update({
      where: { id: pred.id },
      data: { pointsAwarded: points, isExact },
    });
    updated += 1;
  }
  return updated;
}
