// File: backend/src/modules/scoring/scoring.test.ts
// Purpose: Unit tests for the pure scoring engine.
// Functionality: Covers the four score buckets (7/5/3/0) in both group
// stage and knockout matches. Since rule 4 was updated to allow draws in
// playoffs and ignore penalty shootouts, knockouts follow the same rules
// as group matches.
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

  it('awards 5 points when both predicted and real are draws but scores differ', () => {
    // Predicted 1-1, real 2-2. Same winner (none) AND same diff (0) → 5 pts.
    expect(input({ predHome: 1, predAway: 1, realHome: 2, realAway: 2 })).toEqual({
      points: 5,
      isExact: false,
    });
  });
});

describe('calculatePoints — knockout (same rules as group stage)', () => {
  it('treats an exact knockout score as 7 pts', () => {
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

  it('awards points for predicting a knockout draw (rule 4 — updated)', () => {
    // Real result: 1-1 at minute 120 (penalties no longer change scoring).
    // Predicted 0-0 → same winner (draw) + same diff (0) → 5 pts.
    expect(
      input({
        predHome: 0,
        predAway: 0,
        realHome: 1,
        realAway: 1,
        isKnockout: true,
      }),
    ).toEqual({ points: 5, isExact: false });
  });

  it('awards 0 pts when the predicted winner loses a knockout', () => {
    // Real 1-2 at 120 min. Predicted home win → wrong winner → 0 pts.
    expect(
      input({
        predHome: 2,
        predAway: 0,
        realHome: 1,
        realAway: 2,
        isKnockout: true,
      }),
    ).toEqual({ points: 0, isExact: false });
  });
});
