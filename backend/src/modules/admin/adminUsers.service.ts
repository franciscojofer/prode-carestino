// File: backend/src/modules/admin/adminUsers.service.ts
// Purpose: Business logic for the admin user-management endpoints.
// Functionality: List, create, update and soft-delete users while keeping
// the system safe (no self-demotion, no removing the last admin).
// Role: Called by `adminUsers.routes.ts`.

import bcrypt from 'bcrypt';
import type { Prisma as PrismaClient } from '../../lib/db';
import { ConflictError, NotFoundError, ForbiddenError } from '../../lib/errors';
import {
  invalidateStandingsCache,
  invalidateTeamStandingsCache,
} from '../tournament/standings.service';
import type { CreateUserInput, UpdateUserInput } from './adminUsers.schemas';

const BCRYPT_ROUNDS = 12;

// Public-facing user row for the admin panel. Includes joinedRound so the
// admin can see which round each user joined from.
export type AdminUserRow = {
  id: number;
  nombre: string;
  apellido: string;
  cuil: string;
  email: string;
  equipo: string | null;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: Date;
  joinedRound: { id: number; name: string; orderIndex: number } | null;
};

// Common select object used by every read in this module so the shape is
// identical regardless of the operation.
const adminUserSelect = {
  id: true,
  nombre: true,
  apellido: true,
  cuil: true,
  email: true,
  equipo: true,
  isAdmin: true,
  isActive: true,
  createdAt: true,
  joinedRound: { select: { id: true, name: true, orderIndex: true } },
} as const;

// Normalises an incoming `equipo` value: blank strings become null so the
// admin can clear the field by sending an empty input.
function normaliseEquipo(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

// Returns every user (active and inactive) ordered by id.
// Inputs: prisma client. Output: array of users. Read-only.
export async function listUsers(prisma: PrismaClient): Promise<AdminUserRow[]> {
  return prisma.user.findMany({
    orderBy: { id: 'asc' },
    select: adminUserSelect,
  });
}

// Creates a new user from the admin panel. Mirrors the public register flow
// but does not log anyone in — only stores the row.
// Inputs: prisma client, validated input.
// Output: the created user row. Side effects: inserts `User`.
export async function createUserAsAdmin(
  prisma: PrismaClient,
  input: CreateUserInput,
): Promise<AdminUserRow> {
  const [byEmail, byCuil] = await Promise.all([
    prisma.user.findUnique({ where: { email: input.email } }),
    prisma.user.findUnique({ where: { cuil: input.cuil } }),
  ]);
  if (byEmail) throw new ConflictError('Ya existe un usuario con ese email');
  if (byCuil) throw new ConflictError('Ya existe un usuario con ese CUIL');

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  // Active round at creation time (rule 4.7) — the new user only earns
  // points from this round forward.
  const now = new Date();
  const activeRound = await prisma.tournamentRound.findFirst({
    where: { startsAt: { lte: now } },
    orderBy: { orderIndex: 'desc' },
  });

  const created = await prisma.user.create({
    data: {
      nombre: input.nombre,
      apellido: input.apellido,
      cuil: input.cuil,
      email: input.email,
      equipo: normaliseEquipo(input.equipo) ?? null,
      passwordHash,
      isAdmin: input.isAdmin,
      joinedRoundId: activeRound?.id ?? null,
    },
    select: adminUserSelect,
  });

  // A new active user changes the denominator of the by-team averages and
  // adds a row to the individual leaderboard, so drop the cached views.
  invalidateStandingsCache();
  invalidateTeamStandingsCache();

  return created;
}

// Updates an existing user. Re-hashes the password when present, and runs a
// pair of safety checks:
//  - the admin cannot demote or deactivate themselves (would lock them out);
//  - the system must always have at least one active admin.
// Inputs: prisma client, caller (current admin) id, target user id, fields
// to update. Output: the updated user row.
export async function updateUserAsAdmin(
  prisma: PrismaClient,
  callerId: number,
  userId: number,
  input: UpdateUserInput,
): Promise<AdminUserRow> {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new NotFoundError('El usuario no existe');

  // Self-safety: an admin editing themselves cannot lose admin rights or
  // be deactivated in the same request — both would lock them out.
  if (callerId === userId) {
    if (input.isAdmin === false) {
      throw new ForbiddenError('No podés revocarte el rol de administrador a vos mismo');
    }
    if (input.isActive === false) {
      throw new ForbiddenError('No podés desactivar tu propia cuenta');
    }
  }

  // System-safety: never end up with zero active admins.
  if (target.isAdmin && (input.isAdmin === false || input.isActive === false)) {
    const otherAdmins = await prisma.user.count({
      where: { isAdmin: true, isActive: true, id: { not: userId } },
    });
    if (otherAdmins === 0) {
      throw new ForbiddenError(
        'No podés dejar al sistema sin administradores activos',
      );
    }
  }

  // Uniqueness re-check when changing email or CUIL.
  if (input.email && input.email !== target.email) {
    const dup = await prisma.user.findUnique({ where: { email: input.email } });
    if (dup) throw new ConflictError('Ya existe un usuario con ese email');
  }
  if (input.cuil && input.cuil !== target.cuil) {
    const dup = await prisma.user.findUnique({ where: { cuil: input.cuil } });
    if (dup) throw new ConflictError('Ya existe un usuario con ese CUIL');
  }

  // Build the update payload from only the fields that were actually sent.
  const data: {
    nombre?: string;
    apellido?: string;
    cuil?: string;
    email?: string;
    equipo?: string | null;
    passwordHash?: string;
    isAdmin?: boolean;
    isActive?: boolean;
  } = {};
  if (input.nombre !== undefined) data.nombre = input.nombre;
  if (input.apellido !== undefined) data.apellido = input.apellido;
  if (input.cuil !== undefined) data.cuil = input.cuil;
  if (input.email !== undefined) data.email = input.email;
  if (input.equipo !== undefined) data.equipo = normaliseEquipo(input.equipo) ?? null;
  if (input.isAdmin !== undefined) data.isAdmin = input.isAdmin;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  if (input.password !== undefined) {
    data.passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: adminUserSelect,
  });

  // Any change in equipo, name or active state affects the standings the
  // frontend caches, so refresh both views.
  invalidateStandingsCache();
  invalidateTeamStandingsCache();

  return updated;
}

// Soft-deletes a user by flipping `isActive` to false (rule from section 5).
// Same self-safety and last-admin checks as the update path.
// Inputs: prisma client, caller id, target user id. Idempotent — calling
// against an already inactive user is a no-op.
export async function deactivateUser(
  prisma: PrismaClient,
  callerId: number,
  userId: number,
): Promise<void> {
  if (callerId === userId) {
    throw new ForbiddenError('No podés eliminar tu propia cuenta');
  }
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw new NotFoundError('El usuario no existe');
  if (!target.isActive) return;

  if (target.isAdmin) {
    const otherAdmins = await prisma.user.count({
      where: { isAdmin: true, isActive: true, id: { not: userId } },
    });
    if (otherAdmins === 0) {
      throw new ForbiddenError(
        'No podés eliminar al último administrador activo',
      );
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  invalidateStandingsCache();
  invalidateTeamStandingsCache();
}
