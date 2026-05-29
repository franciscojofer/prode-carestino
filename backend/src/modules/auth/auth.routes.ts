// File: backend/src/modules/auth/auth.routes.ts
// Purpose: HTTP routes for authentication: login, logout, /me.
// Functionality: Validates the request body with Zod, delegates to the
// service layer, and manages the session cookie on success.
// Role: Mounted under `/api/auth` from `src/index.ts`. The frontend talks
// only to these endpoints for auth. Public self-registration was removed
// once the payroll seed became the canonical user source.

import type { FastifyInstance } from 'fastify';
import { loginSchema } from './auth.schemas';
import { loginUser } from './auth.service';
import { UnauthorizedError } from '../../lib/errors';

export async function authRoutes(app: FastifyInstance) {
  // POST /login — verifies credentials and issues a session cookie.
  app.post('/login', async (req, reply) => {
    const input = loginSchema.parse(req.body);
    const user = await loginUser(app.prisma, input);
    app.setSessionCookie(reply, { userId: user.id, isAdmin: user.isAdmin });
    return reply.send({ user });
  });

  // POST /logout — clears the session cookie. Idempotent.
  app.post('/logout', async (_req, reply) => {
    app.clearSessionCookie(reply);
    return reply.send({ ok: true });
  });

  // GET /me — returns the authenticated user. Re-reads from the DB so that
  // soft-deleted users (isActive=false) get a 401 even if they still hold
  // a valid token.
  app.get('/me', { onRequest: [app.requireAuth] }, async (req) => {
    const user = await app.prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        isAdmin: true,
        isActive: true,
      },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Sesión inválida');
    }
    const { isActive: _isActive, ...rest } = user;
    return { user: rest };
  });
}
