// File: backend/src/modules/predictions/predictions.guards.ts
// Purpose: Pure validation helpers shared by the predictions service and
// route handlers.
// Functionality: Computes the 15-minute pre-kickoff lock window (rule 4.2)
// and rejects draw predictions in knockout matches (rule 4.3).
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

// Throws a ValidationError when the prediction is a draw in a knockout
// match (rule 4.3). The error message matches the exact text required by
// the spec so the frontend can show it verbatim.
// Inputs: predicted goals and whether the match is a knockout.
// Side effects: may throw.
export function assertKnockoutNotDraw(
  homeGoals: number,
  awayGoals: number,
  isKnockout: boolean,
): void {
  if (isKnockout && homeGoals === awayGoals) {
    throw new ValidationError(
      'No se permite predecir empate en eliminatorias. Ingresá un ganador y un perdedor.',
    );
  }
}
