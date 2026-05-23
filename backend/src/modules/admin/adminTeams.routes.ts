// File: backend/src/modules/admin/adminTeams.routes.ts
// Purpose: Admin-only endpoint that lists every team in the tournament.
// Functionality: Returns id, Spanish name, FIFA code, flag emoji and group
// letter so the admin UI can populate dropdowns when filling in knockout
// pairings whose teams were originally TBD.
// Role: Mounted under `/api/admin/teams` from `src/index.ts`.

import type { FastifyInstance } from 'fastify';

export async function adminTeamsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', app.requireAdmin);

  // GET /admin/teams — full roster including the "Por definir" placeholder
  // (so the admin can revert a slot if a fixture changes).
  app.get('/', async () => {
    const teams = await app.prisma.team.findMany({
      orderBy: [{ groupId: 'asc' }, { nameEs: 'asc' }],
      select: {
        id: true,
        nameEs: true,
        code: true,
        flagEmoji: true,
        group: { select: { name: true } },
      },
    });
    return { teams };
  });
}
