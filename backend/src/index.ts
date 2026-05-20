// File: backend/src/index.ts
// Purpose: Fastify entry point — builds the server, wires up plugins and
// routes, and starts listening.
// Functionality: Registers the global error handler (Zod + AppError mapping),
// loads the db / cookies / auth plugins, mounts the auth routes under
// `/api/auth`, and exposes `/health` for readiness probes.
// Role: The single executable entry of the backend; invoked by `npm run dev`
// (with tsx watch) and by the production container.

import Fastify from 'fastify';
import { ZodError } from 'zod';
import { env } from './lib/env';
import { AppError, TooManyRequestsError } from './lib/errors';
import dbPlugin from './plugins/db';
import cookiesPlugin from './plugins/cookies';
import authPlugin from './plugins/auth';
import { authRoutes } from './modules/auth/auth.routes';

// Pretty logs only in development to keep production output JSON-friendly.
const isDev = env.NODE_ENV !== 'production';

// Constructs the Fastify instance with all plugins and routes wired up.
// Returned (not started) so tests can reuse the same builder.
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

  // All business routes live under `/api` to keep the static frontend served
  // by `@fastify/static` (in production) cleanly separated.
  await app.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/auth' });
    },
    { prefix: '/api' },
  );

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
