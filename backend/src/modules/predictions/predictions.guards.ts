// File: backend/src/modules/predictions/predictions.guards.ts
// Purpose: Pure validation helpers shared by the predictions service and
// route handlers.
// Functionality: Computes the 15-minute pre-kickoff lock window (rule 4.2).
// Draws are now permitted in every match, including knockouts (rule 4 —
// updated), so the previous knockout-no-draw guard was removed.
// Role: Imported by `predictions.service.ts` for write-time checks and by
// `predictions.routes.ts` to inform the frontend whether each match is
// editable. Pure, fully unit-testable.

import { ValidationError } from '../../lib/errors';

// How long before kickoff predictions become locked. Same value used by the
// frontend so the two sides agree.
export const LOCK_WINDOW_MINUTES = 15;

// Returns true when `now` is at or past the lock boundary
// (scheduledAt - 15 min). Once locked, predictions can no longer be created
// or edited.
// Inputs: match's scheduledAt and optional `now` (defaults to current time).
// Output: boolean lock state. Pure — no side effects.
export function isLockedForPredictions(scheduledAt: Date, now: Date = new Date()): boolean {
  const lockTime = scheduledAt.getTime() - LOCK_WINDOW_MINUTES * 60_000;
  return now.getTime() >= lockTime;
}

// Throws a ValidationError when the match is locked.
// Inputs: scheduledAt and optional `now`. Side effects: may throw.
export function assertPredictionEditable(scheduledAt: Date, now: Date = new Date()): void {
  if (isLockedForPredictions(scheduledAt, now)) {
    throw new ValidationError(
      'Las predicciones se cierran 15 minutos antes del partido.',
    );
  }
}
