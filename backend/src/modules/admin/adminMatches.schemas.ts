// File: backend/src/modules/admin/adminMatches.schemas.ts
// Purpose: Zod validators for the admin match-management endpoints.
// Functionality: Bodies for `PUT /:id/result` and `PATCH /:id`, plus path
// and query params.
// Role: Imported by `adminMatches.routes.ts`.

import { z } from 'zod';

// Result payload posted when the admin enters a final score (always the
// score at minute 120 — penalty shootouts are no longer part of scoring,
// rule 4 — updated).
export const matchResultSchema = z.object({
  homeGoals: z.number().int().min(0, 'Debe ser 0 o mayor').max(99),
  awayGoals: z.number().int().min(0, 'Debe ser 0 o mayor').max(99),
});

// Allowed match statuses. Mirrors the values used by the model.
const matchStatusEnum = z.enum(['scheduled', 'finished', 'postponed', 'cancelled']);

// Body for `POST /admin/matches` — used to add knockout fixtures once the
// group stage has determined which teams advance.
// `isKnockout` and `countsForRoundId` are optional; defaults come from the
// round (isKnockout) and from `roundId` (countsForRoundId).
export const createMatchSchema = z.object({
  roundId: z.number().int().positive(),
  homeTeamId: z.number().int().positive(),
  awayTeamId: z.number().int().positive(),
  scheduledAt: z
    .string()
    .datetime({ message: 'scheduledAt debe ser una fecha ISO 8601' })
    .transform((v) => new Date(v)),
  countsForRoundId: z.number().int().positive().optional(),
  isKnockout: z.boolean().optional(),
});

// Generic update payload. All fields optional — the admin updates any
// subset of them. `scheduledAt` accepts an ISO 8601 string from the
// frontend and converts to a Date for Prisma. `homeTeamId` /
// `awayTeamId` exist for knockout slots created with the TBD placeholder:
// once the previous round resolves, the admin assigns the real teams.
export const updateMatchSchema = z
  .object({
    scheduledAt: z
      .string()
      .datetime({ message: 'scheduledAt debe ser una fecha ISO 8601' })
      .transform((v) => new Date(v))
      .optional(),
    countsForRoundId: z.number().int().positive().optional(),
    homeTeamId: z.number().int().positive().optional(),
    awayTeamId: z.number().int().positive().optional(),
    status: matchStatusEnum.optional(),
    resolvedAdministratively: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'No hay cambios para aplicar',
  });

export const matchListQuerySchema = z.object({
  roundId: z.coerce.number().int().positive().optional(),
});

export const matchIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type MatchResultInput = z.infer<typeof matchResultSchema>;
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>;
export type CreateMatchInput = z.infer<typeof createMatchSchema>;
