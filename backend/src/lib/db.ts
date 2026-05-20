// File: backend/src/lib/db.ts
// Purpose: Expose a single shared PrismaClient instance for the whole app.
// Functionality: Instantiates Prisma with a log level that matches the current
// environment (verbose in development, errors-only in production).
// Role: Imported by services and the Fastify db plugin; keeps connections
// pooled in one place to avoid leaking handles in tests or hot reloads.

import { PrismaClient } from '@prisma/client';
import { env } from './env';

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

// Convenience alias used in service signatures so a single import covers both
// the runtime client and its type without re-importing PrismaClient.
export type Prisma = typeof prisma;
