// File: backend/src/modules/auth/auth.service.ts
// Purpose: Business logic for login.
// Functionality: `loginUser` verifies credentials and integrates with the
// lockout policy.
// Role: Called by `auth.routes.ts`; returns plain `AuthUser` objects suitable
// for embedding in HTTP responses (no password hash leaks).

import bcrypt from 'bcrypt';
import type { Prisma } from '../../lib/db';
import { UnauthorizedError } from '../../lib/errors';
import { assertNotLocked, registerFailure, registerSuccess } from './loginAttempt.service';
import type { LoginInput } from './auth.schemas';

// Public-facing user shape. Excludes password hash and any internal flags
// that the frontend should not see.
export type AuthUser = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  isAdmin: boolean;
  // Work-team label. Null when the user has not been assigned to any
  // equipo yet (legacy accounts and admins typically have no equipo).
  equipo: string | null;
};

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
    equipo: user.equipo,
  };
}
