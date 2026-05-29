// File: backend/src/modules/predictions/predictions.guards.test.ts
// Purpose: Unit tests for the prediction guards.
// Functionality: Covers the 15-min lock boundary (above, at, and below).
// The knockout-no-draw guard was removed when rule 4 was updated to
// permit draws in playoffs.
// Role: Required by section 10 of the product spec.

import { describe, it, expect } from 'vitest';
import {
  isLockedForPredictions,
  assertPredictionEditable,
  LOCK_WINDOW_MINUTES,
} from './predictions.guards';
import { ValidationError } from '../../lib/errors';

// Helper: build a Date offset by `minutes` from a fixed reference.
function at(reference: Date, minutes: number): Date {
  return new Date(reference.getTime() + minutes * 60_000);
}

describe('isLockedForPredictions', () => {
  // Reference kickoff time used as the anchor for every relative test below.
  const kickoff = new Date('2026-06-12T19:00:00.000Z');

  it('is NOT locked one minute before the lock window opens', () => {
    expect(isLockedForPredictions(kickoff, at(kickoff, -(LOCK_WINDOW_MINUTES + 1)))).toBe(false);
  });

  it('is locked exactly at the lock boundary (T-15 min)', () => {
    expect(isLockedForPredictions(kickoff, at(kickoff, -LOCK_WINDOW_MINUTES))).toBe(true);
  });

  it('is locked between the boundary and kickoff', () => {
    expect(isLockedForPredictions(kickoff, at(kickoff, -5))).toBe(true);
  });

  it('is locked at kickoff', () => {
    expect(isLockedForPredictions(kickoff, kickoff)).toBe(true);
  });

  it('is locked after kickoff', () => {
    expect(isLockedForPredictions(kickoff, at(kickoff, 30))).toBe(true);
  });

  it('is NOT locked one hour before kickoff', () => {
    expect(isLockedForPredictions(kickoff, at(kickoff, -60))).toBe(false);
  });
});

describe('assertPredictionEditable', () => {
  const kickoff = new Date('2026-06-12T19:00:00.000Z');

  it('does not throw when still editable', () => {
    expect(() => assertPredictionEditable(kickoff, at(kickoff, -60))).not.toThrow();
  });

  it('throws ValidationError when locked', () => {
    expect(() => assertPredictionEditable(kickoff, at(kickoff, -1))).toThrow(ValidationError);
  });

  it('uses a Spanish user-facing message', () => {
    try {
      assertPredictionEditable(kickoff, at(kickoff, -1));
    } catch (err) {
      expect((err as Error).message).toContain('15 minutos antes');
    }
  });
});
