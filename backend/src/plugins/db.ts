// File: backend/src/plugins/db.ts
// Purpose: Fastify plugin that exposes the shared Prisma client on the app
// instance and disconnects gracefully on shutdown.
// Functionality: Decorates `app.prisma` and registers an `onClose` hook that
// calls `prisma.$disconnect()` so SQLite connections don't leak in tests.
// Role: Loaded once in `src/index.ts`; downstream routes access the DB via
// `app.prisma` instead of importing the client directly.

import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { prisma, type Prisma } from '../lib/db';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: Prisma;
  }
}

export default fp(async function dbPlugin(app: FastifyInstance) {
  app.decorate('prisma', prisma);
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
