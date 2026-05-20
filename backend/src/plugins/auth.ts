// File: backend/src/plugins/auth.ts
// Purpose: Register JWT-based session handling and expose auth guards.
// Functionality: Configures `@fastify/jwt` to read the session token from a
// httpOnly cookie, decorates the app with `requireAuth` / `requireAdmin`
// guards, and provides helpers to set or clear the session cookie.
// Role: Loaded once in `src/index.ts`; routes use the guards via the
// `onRequest` hook and call `setSessionCookie` on successful login/register.

import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from '@fastify/jwt';
import { env } from '../lib/env';
import { ForbiddenError, UnauthorizedError } from '../lib/errors';

// Cookie name and lifetime. 7 days is comfortable for a one-month tournament
// where users typically log in once and stay signed in.
export const SESSION_COOKIE = 'prode_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

// Shape of the JWT body. `isAdmin` is included to avoid a DB lookup on every
// request; it becomes stale only if an admin flips the flag, which forces the
// affected user to log in again to see the change.
type SessionPayload = { userId: number; isAdmin: boolean };

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: SessionPayload;
    user: SessionPayload;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    setSessionCookie: (reply: FastifyReply, payload: SessionPayload) => void;
    clearSessionCookie: (reply: FastifyReply) => void;
  }
}

export default fp(async function authPlugin(app: FastifyInstance) {
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    cookie: { cookieName: SESSION_COOKIE, signed: false },
  });

  // Guard: ensures the request has a valid session cookie. Throws 401 otherwise.
  app.decorate('requireAuth', async (req: FastifyRequest) => {
    try {
      await req.jwtVerify();
    } catch {
      throw new UnauthorizedError('Sesión expirada o inválida');
    }
  });

  // Guard: requires a valid session AND `isAdmin = true` on the payload.
  app.decorate('requireAdmin', async (req: FastifyRequest, reply: FastifyReply) => {
    await app.requireAuth(req, reply);
    if (!req.user.isAdmin) {
      throw new ForbiddenError();
    }
  });

  // Helper: sign a fresh JWT and attach it as the session cookie.
  app.decorate('setSessionCookie', (reply: FastifyReply, payload: SessionPayload) => {
    const token = app.jwt.sign(payload, { expiresIn: '7d' });
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: env.COOKIE_SECURE,
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  });

  // Helper: clear the cookie on logout.
  app.decorate('clearSessionCookie', (reply: FastifyReply) => {
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
  });
});
