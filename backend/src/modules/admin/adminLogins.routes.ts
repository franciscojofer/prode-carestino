// File: backend/src/modules/admin/adminLogins.routes.ts
// Purpose: HTTP route for the admin login-audit panel.
// Functionality: Exposes a paginated, admin-only listing of login events
// (newest first) so admins can spot a single IP used by multiple accounts.
// Role: Mounted under `/api/admin/logins` from `src/index.ts`.

import type { FastifyInstance } from 'fastify';
import { loginsQuerySchema } from './adminLogins.schemas';
import { listLoginEvents } from './adminLogins.service';

export async function adminLoginsRoutes(app: FastifyInstance) {
  // Every route in this module requires admin auth.
  app.addHook('onRequest', app.requireAdmin);

  // GET /admin/logins?page=N — one 100-row page of login events.
  app.get('/', async (req) => {
    const { page } = loginsQuerySchema.parse(req.query);
    return listLoginEvents(app.prisma, page);
  });
}
