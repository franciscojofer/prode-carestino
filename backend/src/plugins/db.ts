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
  // Enable SQLite Write-Ahead Logging so the admin writing a match result
  // does not block the 150+ concurrent reads that hit /standings and
  // /groups right after a game ends. `synchronous=NORMAL` is the WAL-safe
  // default that trades a negligible durability window for a large write
  // throughput gain on a single-file SQLite database. We use
  // `$queryRawUnsafe` because PRAGMA statements return rows, which the
  // `$executeRaw*` variants reject under the SQLite driver.
  await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
  await prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL;');

  app.decorate('prisma', prisma);
  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
