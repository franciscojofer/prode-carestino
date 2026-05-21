// File: backend/src/modules/admin/adminMatches.schemas.ts
// Purpose: Zod validators for the admin match-management endpoints.
// Functionality: Bodies for `PUT /:id/result` and `PATCH /:id`, plus path
// and query params.
// Role: Imported by `adminMatches.routes.ts`.

import { z } from 'zod';

// Result payload posted when the admin enters a final score.
// `winnerByPenaltiesTeamId` is optional and only used when the match ended
// tied at 120 minutes in a knockout round.
export const matchResultSchema = z.object({
  homeGoals: z.number().int().min(0, 'Debe ser 0 o mayor').max(99),
  awayGoals: z.number().int().min(0, 'Debe ser 0 o mayor').max(99),
  winnerByPenaltiesTeamId: z.number().int().positive().nullable().optional(),
});

// Allowed match statuses. Mirrors the values used by the model.
const matchStatusEnum = z.enum(['scheduled', 'finished', 'postponed', 'cancelled']);

// Generic update payload. All fields optional — the admin updates any
// subset of them. `scheduledAt` accepts an ISO 8601 string from the
// frontend and converts to a Date for Prisma.
export const updateMatchSchema = z
  .object({
    scheduledAt: z
      .string()
      .datetime({ message: 'scheduledAt debe ser una fecha ISO 8601' })
      .transform((v) => new Date(v))
      .optional(),
    countsForRoundId: z.number().int().positive().optional(),
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
