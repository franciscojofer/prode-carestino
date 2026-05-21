// File: backend/src/modules/admin/adminMatches.routes.ts
// Purpose: HTTP routes for admin-only match management.
// Functionality: List matches per round, post a final score (which fires
// the scoring engine), and patch match metadata.
// Role: Mounted under `/api/admin/matches` from `src/index.ts`.

import type { FastifyInstance } from 'fastify';
import {
  matchResultSchema,
  updateMatchSchema,
  matchListQuerySchema,
  matchIdParamSchema,
  createMatchSchema,
} from './adminMatches.schemas';
import {
  listMatches,
  setMatchResult,
  updateMatch,
  createMatch,
} from './adminMatches.service';

export async function adminMatchesRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.requireAdmin);

  // GET /admin/matches?roundId=N — matches of a round (or all if omitted).
  app.get('/', async (req) => {
    const { roundId } = matchListQuerySchema.parse(req.query);
    const matches = await listMatches(app.prisma, roundId);
    return { matches };
  });

  // POST /admin/matches — adds a new fixture (typically a knockout pairing
  // once the group stage has decided who advances).
  app.post('/', async (req, reply) => {
    const input = createMatchSchema.parse(req.body);
    const match = await createMatch(app.prisma, input);
    return reply.code(201).send({ match });
  });

  // PUT /admin/matches/:id/result — stores the final score and recomputes
  // points for every prediction tied to the match.
  app.put('/:id/result', async (req) => {
    const { id } = matchIdParamSchema.parse(req.params);
    const input = matchResultSchema.parse(req.body);
    await setMatchResult(app.prisma, id, input);
    return { ok: true };
  });

  // PATCH /admin/matches/:id — partial update of match metadata.
  app.patch('/:id', async (req) => {
    const { id } = matchIdParamSchema.parse(req.params);
    const input = updateMatchSchema.parse(req.body);
    await updateMatch(app.prisma, id, input);
    return { ok: true };
  });
}
