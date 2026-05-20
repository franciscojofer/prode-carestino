// File: backend/src/modules/auth/auth.service.ts
// Purpose: Business logic for user registration and login.
// Functionality: `registerUser` creates an account with a bcrypt-hashed
// password and assigns the user to the current tournament round.
// `loginUser` verifies credentials and integrates with the lockout policy.
// Role: Called by `auth.routes.ts`; returns plain `AuthUser` objects suitable
// for embedding in HTTP responses (no password hash leaks).

import bcrypt from 'bcrypt';
import type { Prisma } from '../../lib/db';
import { ConflictError, UnauthorizedError } from '../../lib/errors';
import { assertNotLocked, registerFailure, registerSuccess } from './loginAttempt.service';
import type { RegisterInput, LoginInput } from './auth.schemas';

// bcrypt cost. 12 is the standard sweet spot — ~250 ms on a modest server,
// fast enough for a 100-user app and slow enough to deter offline attacks.
const BCRYPT_ROUNDS = 12;

// Public-facing user shape. Excludes password hash and any internal flags
// that the frontend should not see.
export type AuthUser = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  isAdmin: boolean;
};

// Creates a new user. Pre-checks email/CUIL uniqueness so the response can
// be a friendly 409 instead of a raw DB constraint error.
// Inputs: prisma client and validated register payload.
// Output: the new `AuthUser`. Side effects: inserts `User` row.
export async function registerUser(prisma: Prisma, input: RegisterInput): Promise<AuthUser> {
  const [byEmail, byCuil] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email } }),
    prisma.user.findUnique({ where: { cuil: input.cuil } }),
  ]);
  if (byEmail) throw new ConflictError('Ya existe un usuario con ese email');
  if (byCuil) throw new ConflictError('Ya existe un usuario con ese CUIL');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  // Assign the user to the active tournament round per rule 4.7 — they only
  // accrue points from matches in this round onwards.
  const now = new Date();
  const activeRound = await prisma.tournamentRound.findFirst({
    where: { startsAt: { lte: now } },
    orderBy: { orderIndex: 'desc' },
  });

  const user = await prisma.user.create({
    data: {
      nombre: input.nombre,
      apellido: input.apellido,
      cuil: input.cuil,
      email: input.email,
      passwordHash,
      joinedRoundId: activeRound?.id ?? null,
    },
    select: { id: true, nombre: true, apellido: true, email: true, isAdmin: true },
  });

  return user;
}

// Authenticates an existing user. Applies the lockout policy before and
// after the password check.
// Inputs: prisma client and validated login payload.
// Output: the matching `AuthUser`. Side effects: updates `LoginAttempt`.
// Throws: `UnauthorizedError` on bad credentials, `TooManyRequestsError`
// when the account is locked or this attempt triggered a fresh lockout.
export async function loginUser(prisma: Prisma, input: LoginInput): Promise<AuthUser> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) {
    // Generic message — never leak whether the email exists.
    throw new UnauthorizedError('Credenciales inválidas');
  }

  await assertNotLocked(prisma, user.id);

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) {
    // May itself throw TooManyRequestsError if this attempt was the 5th.
    await registerFailure(prisma, user.id);
    throw new UnauthorizedError('Credenciales inválidas');
  }

  await registerSuccess(prisma, user.id);

  return {
    id: user.id,
    nombre: user.nombre,
    apellido: user.apellido,
    email: user.email,
    isAdmin: user.isAdmin,
  };
}
