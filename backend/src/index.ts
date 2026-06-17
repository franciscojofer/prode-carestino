// File: backend/src/index.ts
// Purpose: Fastify entry point — builds the server, wires up plugins and
// routes, and starts listening.
// Functionality: Registers the global error handler (Zod + AppError mapping),
// loads the db / cookies / auth plugins, mounts the API routes under
// `/api`, and in production also serves the compiled frontend from disk
// with an SPA fallback to index.html.
// Role: The single executable entry of the backend; invoked by `npm run dev`
// (with tsx watch) and by the production container.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import Fastify from 'fastify';
import staticPlugin from '@fastify/static';
import { ZodError } from 'zod';
import { env } from './lib/env';
import { AppError, TooManyRequestsError } from './lib/errors';
import dbPlugin from './plugins/db';
import cookiesPlugin from './plugins/cookies';
import authPlugin from './plugins/auth';
import { authRoutes } from './modules/auth/auth.routes';
import { tournamentRoutes } from './modules/tournament/tournament.routes';
import { predictionsRoutes } from './modules/predictions/predictions.routes';
import { adminUsersRoutes } from './modules/admin/adminUsers.routes';
import { adminMatchesRoutes } from './modules/admin/adminMatches.routes';
import { adminTeamsRoutes } from './modules/admin/adminTeams.routes';
import { adminLoginsRoutes } from './modules/admin/adminLogins.routes';

const isDev = env.NODE_ENV !== 'production';

// Resolve `__dirname` ourselves because we run as ES modules.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the compiled frontend bundle. In a Docker / production layout
// the repo's `frontend/dist` sits next to `backend/`, so the relative
// resolution works both inside the container and on a local
// `npm run build && npm start` run.
const FRONTEND_DIST = resolve(__dirname, '..', '..', 'frontend', 'dist');

// Constructs the Fastify instance with all plugins and routes wired up.
// Inputs: none. Output: a ready-to-listen FastifyInstance.
export async function buildServer() {
  const app = Fastify({
    logger: isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
          },
        }
      : true,
    // Trust X-Forwarded-* headers from the reverse proxy so request IPs
    // and protocols (http vs https) are read correctly behind nginx.
    trustProxy: true,
  });

  // Centralized error handler. Translates ZodError into structured 400
  // payloads, maps AppError subclasses to their declared status codes, and
  // logs anything unexpected as a 500.
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      const issue = error.issues[0];
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: issue?.message ?? 'Datos inválidos',
        field: issue?.path.join('.') ?? undefined,
      });
    }
    if (error instanceof AppError) {
      if (error instanceof TooManyRequestsError && error.retryAfterSeconds) {
        reply.header('Retry-After', error.retryAfterSeconds);
      }
      return reply.code(error.statusCode).send({
        error: error.code,
        message: error.message,
      });
    }
    request.log.error(error);
    return reply.code(500).send({ error: 'INTERNAL', message: 'Error interno' });
  });

  await app.register(dbPlugin);
  await app.register(cookiesPlugin);
  await app.register(authPlugin);

  app.get('/health', async () => ({ status: 'ok' }));

  // All business routes live under `/api` to keep the static frontend
  // (served below in production) cleanly separated.
  await app.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/auth' });
      await api.register(tournamentRoutes, { prefix: '/tournament' });
      await api.register(predictionsRoutes, { prefix: '/predictions' });
      await api.register(adminUsersRoutes, { prefix: '/admin/users' });
      await api.register(adminMatchesRoutes, { prefix: '/admin/matches' });
      await api.register(adminTeamsRoutes, { prefix: '/admin/teams' });
      await api.register(adminLoginsRoutes, { prefix: '/admin/logins' });
    },
    { prefix: '/api' },
  );

  // Production-only: serve the compiled SPA from `frontend/dist`. When
  // the bundle is missing (e.g. local dev where Vite serves the frontend
  // separately) we skip this block silently.
  if (!isDev && existsSync(FRONTEND_DIST)) {
    await app.register(staticPlugin, {
      root: FRONTEND_DIST,
      // Index file is served at "/" by default.
      prefix: '/',
      // Reasonable caching for hashed Vite assets.
      cacheControl: true,
      maxAge: '1h',
    });

    // SPA fallback: any unmatched route that is NOT under /api should
    // return the React shell so client-side routes (/torneo, /admin/…)
    // load directly when the user refreshes.
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/')) {
        return reply
          .code(404)
          .send({ error: 'NOT_FOUND', message: 'Ruta no encontrada' });
      }
      return reply.sendFile('index.html');
    });
  }

  return app;
}

// Bootstraps the server. Logs the fatal error and exits non-zero on failure.
async function main() {
  const app = await buildServer();
  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
