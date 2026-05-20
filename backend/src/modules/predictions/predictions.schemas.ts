// File: backend/src/modules/predictions/predictions.schemas.ts
// Purpose: Zod validators for the predictions endpoints.
// Functionality: Defines the body schema for `PUT /predictions/:matchId`
// and the path-parameter schemas used by the routes.
// Role: Imported by `predictions.routes.ts` to validate inputs before they
// reach the service layer.

import { z } from 'zod';

// Goal counts are non-negative integers. Cap at 99 to reject pathological
// inputs without writing a custom rule for "reasonable" scores.
export const predictionInputSchema = z.object({
  homeGoals: z
    .number({ message: 'Goles del local debe ser un número' })
    .int('Debe ser un número entero')
    .min(0, 'Debe ser 0 o mayor')
    .max(99, 'Demasiados goles'),
  awayGoals: z
    .number({ message: 'Goles del visitante debe ser un número' })
    .int('Debe ser un número entero')
    .min(0, 'Debe ser 0 o mayor')
    .max(99, 'Demasiados goles'),
});

export const roundIdParamSchema = z.object({
  roundId: z.coerce.number().int().positive(),
});

export const matchIdParamSchema = z.object({
  matchId: z.coerce.number().int().positive(),
});

export type PredictionInput = z.infer<typeof predictionInputSchema>;
