// File: backend/src/modules/predictions/predictions.routes.ts
// Purpose: HTTP routes for the authenticated user's own predictions.
// Functionality: GET current-round predictions, GET predictions of a given
// round, PUT a prediction for one match (creates or updates).
// Role: Mounted under `/api/predictions` from `src/index.ts`. Used by the
// Predicciones screen.

import type { FastifyInstance } from 'fastify';
import {
  predictionInputSchema,
  roundIdParamSchema,
  matchIdParamSchema,
} from './predictions.schemas';
import { upsertPrediction, listPredictionsForRound } from './predictions.service';
import { getActiveRound } from '../tournament/tournament.queries';

export async function predictionsRoutes(app: FastifyInstance) {
  // GET /current — predictions for the round currently open for editing.
  app.get('/current', { onRequest: [app.requireAuth] }, async (req) => {
    const activeRound = await getActiveRound(app.prisma);
    if (!activeRound) return { round: null, matches: [] };
    return listPredictionsForRound(app.prisma, req.user.userId, activeRound.id);
  });

  // GET /round/:roundId — predictions for any round (read-only when locked).
  app.get('/round/:roundId', { onRequest: [app.requireAuth] }, async (req) => {
    const { roundId } = roundIdParamSchema.parse(req.params);
    return listPredictionsForRound(app.prisma, req.user.userId, roundId);
  });

  // PUT /:matchId — create or update the user's prediction for one match.
  app.put('/:matchId', { onRequest: [app.requireAuth] }, async (req) => {
    const { matchId } = matchIdParamSchema.parse(req.params);
    const input = predictionInputSchema.parse(req.body);
    await upsertPrediction(app.prisma, req.user.userId, matchId, input);
    return { ok: true };
  });
}
