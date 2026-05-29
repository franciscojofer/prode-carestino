// File: backend/src/modules/tournament/standings.test.ts
// Purpose: Unit tests for the position-assignment helper used by the
// leaderboard.
// Functionality: Exercises rule 8 (updated) — positions are sequential
// and unique even when metric tuples are identical, since callers are
// expected to fully sort rows by the entire tie-break tuple.
// Role: Required by section 10 of the product spec (standings test).

import { describe, it, expect } from 'vitest';
import { __test } from './standings.service';

const { assignPositions } = __test;

// Builder so each test reads as data. The tie-break metrics default to 0
// because `assignPositions` itself only cares about ordering, not values.
function row(partial: { userId: number; name: string; totalPoints: number; exactCount?: number; gdHitCount?: number; winnerGoals?: number }) {
  return {
    exactCount: 0,
    gdHitCount: 0,
    winnerGoals: 0,
    ...partial,
  };
}

describe('assignPositions (rule 8 — unique sequential positions)', () => {
  it('assigns sequential positions when no ties exist', () => {
    const rows = [
      row({ userId: 1, name: 'A', totalPoints: 30 }),
      row({ userId: 2, name: 'B', totalPoints: 25 }),
      row({ userId: 3, name: 'C', totalPoints: 20 }),
    ];
    expect(assignPositions(rows).map((r) => r.position)).toEqual([1, 2, 3]);
  });

  it('never shares a position, even when point totals match', () => {
    // Spec change: where the old rule produced 1, 2, 2, 4 the new one is
    // strictly 1, 2, 3, 4 — the caller is responsible for resolving the
    // tie through the full tie-break tuple.
    const rows = [
      row({ userId: 1, name: 'A', totalPoints: 30 }),
      row({ userId: 2, name: 'B', totalPoints: 28 }),
      row({ userId: 3, name: 'C', totalPoints: 28 }),
      row({ userId: 4, name: 'D', totalPoints: 27 }),
    ];
    expect(assignPositions(rows).map((r) => r.position)).toEqual([1, 2, 3, 4]);
  });

  it('preserves the input order of rows inside a tie', () => {
    // Caller is expected to have already applied the full ordering tuple.
    // The function must not reorder rows.
    const rows = [
      row({ userId: 1, name: 'Z', totalPoints: 30, exactCount: 6 }),
      row({ userId: 2, name: 'A', totalPoints: 30, exactCount: 2 }),
    ];
    const result = assignPositions(rows);
    expect(result[0].userId).toBe(1);
    expect(result[1].userId).toBe(2);
    expect(result[0].position).toBe(1);
    expect(result[1].position).toBe(2);
  });
});
