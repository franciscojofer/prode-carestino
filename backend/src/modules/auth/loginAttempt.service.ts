// File: backend/src/modules/auth/loginAttempt.service.ts
// Purpose: Track failed login attempts per user and apply the escalating
// lockout policy described in rule 4.9 of the product spec.
// Functionality: Exposes three primitives — `assertNotLocked`, `registerFailure`
// and `registerSuccess` — that the login service uses to gate authentication.
// Lockouts grow exponentially (15, 30, 60, … up to 1440 minutes) and reset
// after 24 hours of inactivity.
// Role: Called by `auth.service.ts` during the login flow.

import type { Prisma } from '../../lib/db';
import { TooManyRequestsError } from '../../lib/errors';

// Threshold after which a fresh lockout fires.
const MAX_ATTEMPTS = 5;
// Hours of inactivity that reset the lockout level back to 0.
const LEVEL_RESET_HOURS = 24;

// Returns the lockout duration in minutes for a given level.
// Formula: min(15 * 2^(level-1), 1440). Capped at 24 hours.
export function getLockMinutes(level: number): number {
  if (level < 1) return 0;
  return Math.min(15 * Math.pow(2, level - 1), 1440);
}

// Throws `TooManyRequestsError` when the user is currently locked.
// Inputs: prisma client, user id. Side effects: none — read only.
export async function assertNotLocked(prisma: Prisma, userId: number): Promise<void> {
  const attempt = await prisma.loginAttempt.findUnique({ where: { userId } });
  if (!attempt?.lockedUntil) return;
  const now = new Date();
  if (attempt.lockedUntil <= now) return;
  // Round up so the user never sees "Reintentá en 0 minutos".
  const remainingMinutes = Math.max(
    1,
    Math.ceil((attempt.lockedUntil.getTime() - now.getTime()) / 60_000),
  );
  throw new TooManyRequestsError(
    `Cuenta bloqueada temporalmente. Reintentá en ${remainingMinutes} minutos.`,
    remainingMinutes * 60,
  );
}

// Records a failed authentication attempt.
// - Increments `failedCount`. If MAX_ATTEMPTS is reached, escalates the
//   lockout level and sets `lockedUntil`, then throws `TooManyRequestsError`.
// - If the previous failure happened more than 24 h ago, resets level/count
//   first so users aren't punished forever for old typos.
// Inputs: prisma client, user id. Side effects: writes `LoginAttempt`; may throw.
export async function registerFailure(prisma: Prisma, userId: number): Promise<void> {
  const now = new Date();
  const existing = await prisma.loginAttempt.findUnique({ where: { userId } });

  let lockoutLevel = existing?.lockoutLevel ?? 0;
  let failedCount = existing?.failedCount ?? 0;

  // Inactivity reset (rule 4.9): more than 24 h without a failure clears the
  // escalation, so the next lockout starts at level 1 again.
  if (existing?.lastFailedAt) {
    const hoursSinceLast = (now.getTime() - existing.lastFailedAt.getTime()) / 3_600_000;
    if (hoursSinceLast >= LEVEL_RESET_HOURS) {
      lockoutLevel = 0;
      failedCount = 0;
    }
  }

  failedCount += 1;
  let lockedUntil: Date | null = null;
  let newLevel = lockoutLevel;

  if (failedCount >= MAX_ATTEMPTS) {
    newLevel = lockoutLevel + 1;
    const minutes = getLockMinutes(newLevel);
    lockedUntil = new Date(now.getTime() + minutes * 60_000);
    // Counter resets when a lockout is triggered so the cycle starts fresh
    // after the user serves their time.
    failedCount = 0;
  }

  await prisma.loginAttempt.upsert({
    where: { userId },
    create: { userId, failedCount, lockoutLevel: newLevel, lockedUntil, lastFailedAt: now },
    update: { failedCount, lockoutLevel: newLevel, lockedUntil, lastFailedAt: now },
  });

  if (lockedUntil) {
    const minutes = getLockMinutes(newLevel);
    throw new TooManyRequestsError(
      `Cuenta bloqueada temporalmente. Reintentá en ${minutes} minutos.`,
      minutes * 60,
    );
  }
}

// Records a successful login. Resets `failedCount` to 0 and clears any
// pending lockout, but intentionally preserves `lockoutLevel` — escalation
// state only fades through inactivity (rule 4.9).
// Inputs: prisma client, user id. Side effects: writes `LoginAttempt`.
export async function registerSuccess(prisma: Prisma, userId: number): Promise<void> {
  await prisma.loginAttempt.upsert({
    where: { userId },
    create: { userId, failedCount: 0 },
    update: { failedCount: 0, lockedUntil: null },
  });
}
