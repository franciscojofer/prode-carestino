// File: backend/src/modules/admin/adminUsers.routes.ts
// Purpose: HTTP routes for admin-only user management.
// Functionality: Wires CRUD endpoints (list / create / update / soft-delete)
// guarded by the `requireAdmin` decorator from the auth plugin.
// Role: Mounted under `/api/admin/users` from `src/index.ts`.

import type { FastifyInstance } from 'fastify';
import {
  createUserSchema,
  updateUserSchema,
  userIdParamSchema,
} from './adminUsers.schemas';
import {
  listUsers,
  createUserAsAdmin,
  updateUserAsAdmin,
  deactivateUser,
} from './adminUsers.service';

export async function adminUsersRoutes(app: FastifyInstance) {
  // Every route in this module requires admin auth.
  app.addHook('onRequest', app.requireAdmin);

  // GET /admin/users — list every user (active and inactive).
  app.get('/', async () => {
    const users = await listUsers(app.prisma);
    return { users };
  });

  // POST /admin/users — create a new user. Returns 201 with the row.
  app.post('/', async (req, reply) => {
    const input = createUserSchema.parse(req.body);
    const user = await createUserAsAdmin(app.prisma, input);
    return reply.code(201).send({ user });
  });

  // PATCH /admin/users/:id — partial update; also handles password reset
  // when `password` is included in the body.
  app.patch('/:id', async (req) => {
    const { id } = userIdParamSchema.parse(req.params);
    const input = updateUserSchema.parse(req.body);
    const user = await updateUserAsAdmin(app.prisma, req.user.userId, id, input);
    return { user };
  });

  // DELETE /admin/users/:id — soft delete (isActive=false). Idempotent.
  app.delete('/:id', async (req, reply) => {
    const { id } = userIdParamSchema.parse(req.params);
    await deactivateUser(app.prisma, req.user.userId, id);
    return reply.code(204).send();
  });
}
