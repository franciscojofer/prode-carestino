// File: backend/src/modules/tournament/standings.test.ts
// Purpose: Unit tests for the shared-rank assignment used by the leaderboard.
// Functionality: Exercises rule 4.8 — tied users share the same position
// number and the next position is skipped accordingly.
// Role: Required by section 10 of the product spec (standings tie test).

import { describe, it, expect } from 'vitest';
import { __test } from './standings.service';

const { assignPositions } = __test;

describe('assignPositions (rule 4.8 — shared ranks)', () => {
  it('assigns sequential positions when no ties exist', () => {
    const rows = [
      { userId: 1, name: 'A', totalPoints: 30, exactCount: 5 },
      { userId: 2, name: 'B', totalPoints: 25, exactCount: 4 },
      { userId: 3, name: 'C', totalPoints: 20, exactCount: 2 },
    ];
    expect(assignPositions(rows).map((r) => r.position)).toEqual([1, 2, 3]);
  });

  it('shares position on a tie and skips the next slot', () => {
    // Spec example: 1° (30), 2° (28), 2° (28), 4° (27) — the 3rd slot is
    // skipped because the second position is shared.
    const rows = [
      { userId: 1, name: 'A', totalPoints: 30, exactCount: 5 },
      { userId: 2, name: 'B', totalPoints: 28, exactCount: 4 },
      { userId: 3, name: 'C', totalPoints: 28, exactCount: 3 },
      { userId: 4, name: 'D', totalPoints: 27, exactCount: 2 },
    ];
    expect(assignPositions(rows).map((r) => r.position)).toEqual([1, 2, 2, 4]);
  });

  it('handles triple ties at the top', () => {
    const rows = [
      { userId: 1, name: 'A', totalPoints: 30, exactCount: 6 },
      { userId: 2, name: 'B', totalPoints: 30, exactCount: 5 },
      { userId: 3, name: 'C', totalPoints: 30, exactCount: 4 },
      { userId: 4, name: 'D', totalPoints: 25, exactCount: 3 },
    ];
    expect(assignPositions(rows).map((r) => r.position)).toEqual([1, 1, 1, 4]);
  });

  it('keeps tied rows in their pre-sorted exactCount order', () => {
    // Caller is expected to have sorted by points DESC, exactCount DESC.
    // The function must not reorder rows inside a tie.
    const rows = [
      { userId: 1, name: 'Z', totalPoints: 30, exactCount: 6 },
      { userId: 2, name: 'A', totalPoints: 30, exactCount: 2 },
    ];
    const result = assignPositions(rows);
    expect(result[0].userId).toBe(1);
    expect(result[1].userId).toBe(2);
    expect(result[0].position).toBe(1);
    expect(result[1].position).toBe(1);
  });
});
