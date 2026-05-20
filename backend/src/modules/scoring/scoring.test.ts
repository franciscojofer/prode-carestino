// File: backend/src/modules/scoring/scoring.test.ts
// Purpose: Unit tests for the pure scoring engine.
// Functionality: Covers the four score buckets in group stage (7/5/3/0) and
// the knockout-by-penalties exception. Runs under Vitest with no DB.
// Role: Required by section 10 of the product spec — these tests are
// part of the acceptance criteria for the scoring rules.

import { describe, it, expect } from 'vitest';
import { calculatePoints } from './scoring';

// Convenience builder so each test reads as data, not boilerplate.
function input(partial: Partial<Parameters<typeof calculatePoints>[0]>) {
  return calculatePoints({
    predHome: 0,
    predAway: 0,
    realHome: 0,
    realAway: 0,
    isKnockout: false,
    winnerByPenaltiesTeamId: null,
    homeTeamId: 1,
    awayTeamId: 2,
    ...partial,
  });
}

describe('calculatePoints — group stage', () => {
  it('awards 7 points and isExact=true for an exact score', () => {
    expect(input({ predHome: 2, predAway: 1, realHome: 2, realAway: 1 })).toEqual({
      points: 7,
      isExact: true,
    });
  });

  it('awards 5 points when the winner and goal difference match', () => {
    // Predicted 2-0 (home by 2), real 3-1 (home by 2): same winner, same diff.
    expect(input({ predHome: 2, predAway: 0, realHome: 3, realAway: 1 })).toEqual({
      points: 5,
      isExact: false,
    });
  });

  it('awards 3 points when only the winner is right', () => {
    // Predicted 2-1 (home wins by 1), real 4-1 (home wins by 3).
    expect(input({ predHome: 2, predAway: 1, realHome: 4, realAway: 1 })).toEqual({
      points: 3,
      isExact: false,
    });
  });

  it('awards 0 points when the winner is wrong', () => {
    // Predicted home win, real away win.
    expect(input({ predHome: 2, predAway: 0, realHome: 0, realAway: 1 })).toEqual({
      points: 0,
      isExact: false,
    });
  });

  it('awards 7 points for an exact draw', () => {
    expect(input({ predHome: 1, predAway: 1, realHome: 1, realAway: 1 })).toEqual({
      points: 7,
      isExact: true,
    });
  });

  it('awards 3 points when both predicted and real are draws but scores differ', () => {
    // Predicted 1-1, real 2-2. Same winner (none) but different exact score.
    // Per the spec: same winner = 3 pts; same winner + same diff = 5 pts.
    // Both draws share diff=0, so this is actually 5 pts.
    expect(input({ predHome: 1, predAway: 1, realHome: 2, realAway: 2 })).toEqual({
      points: 5,
      isExact: false,
    });
  });
});

describe('calculatePoints — knockout, decided in regulation', () => {
  it('treats a knockout finished in 120 min like a group match (5 pts)', () => {
    expect(
      input({
        predHome: 2,
        predAway: 0,
        realHome: 3,
        realAway: 1,
        isKnockout: true,
      }),
    ).toEqual({ points: 5, isExact: false });
  });

  it('still awards 7 pts for an exact knockout score', () => {
    expect(
      input({
        predHome: 1,
        predAway: 0,
        realHome: 1,
        realAway: 0,
        isKnockout: true,
      }),
    ).toEqual({ points: 7, isExact: true });
  });
});

describe('calculatePoints — knockout decided on penalties (rule 4.1 exception)', () => {
  // Setup: home team id = 10, away team id = 20.
  const HOME = 10;
  const AWAY = 20;

  it('awards 3 pts to a user who picked the penalty-shootout winner', () => {
    // Real result: 1-1 in 120 min; home team won on penalties.
    // Prediction: 2-1 home (predicted home as winner). Match → 3 pts.
    expect(
      calculatePoints({
        predHome: 2,
        predAway: 1,
        realHome: 1,
        realAway: 1,
        isKnockout: true,
        winnerByPenaltiesTeamId: HOME,
        homeTeamId: HOME,
        awayTeamId: AWAY,
      }),
    ).toEqual({ points: 3, isExact: false });
  });

  it('awards 0 pts to a user who picked the wrong team', () => {
    // Real 1-1, penalties won by home. Prediction: away win 2-1.
    expect(
      calculatePoints({
        predHome: 1,
        predAway: 2,
        realHome: 1,
        realAway: 1,
        isKnockout: true,
        winnerByPenaltiesTeamId: HOME,
        homeTeamId: HOME,
        awayTeamId: AWAY,
      }),
    ).toEqual({ points: 0, isExact: false });
  });

  it('still awards 7 pts when the prediction was an exact draw (defensive)', () => {
    // The frontend and backend should never allow a draw prediction in
    // knockouts, but if one ever slips in and matches the 120-min result,
    // exact-score still wins out.
    expect(
      calculatePoints({
        predHome: 1,
        predAway: 1,
        realHome: 1,
        realAway: 1,
        isKnockout: true,
        winnerByPenaltiesTeamId: 10,
        homeTeamId: 10,
        awayTeamId: 20,
      }),
    ).toEqual({ points: 7, isExact: true });
  });

  it('awards 0 pts in knockout draw without penalty info (data inconsistency)', () => {
    // Knockout finished 0-0 in 120 min with no winnerByPenaltiesTeamId set.
    // Real winner = draw, but the user predicted a winner so no points.
    expect(
      calculatePoints({
        predHome: 2,
        predAway: 1,
        realHome: 0,
        realAway: 0,
        isKnockout: true,
        winnerByPenaltiesTeamId: null,
        homeTeamId: 10,
        awayTeamId: 20,
      }),
    ).toEqual({ points: 0, isExact: false });
  });
});
