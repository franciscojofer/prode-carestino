// File: backend/src/lib/env.ts
// Purpose: Load and validate runtime environment variables.
// Functionality: Reads .env (when present) via dotenv, then parses the values
// with a Zod schema. If any required variable is missing or invalid, the
// process exits with a human-readable explanation.
// Role: Single source of truth for environment configuration; imported by any
// module that needs ports, secrets, or feature toggles.

import 'dotenv/config';
import { z } from 'zod';

// Accepts the strings "true"/"1" as truthy and everything else as false.
// Used for boolean environment variables, which the OS always passes as strings.
const boolFromString = z.preprocess((v) => {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v === 'true' || v === '1';
  return false;
}, z.boolean());

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Must be long enough to keep JWT signing safe even in development.
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatorio'),
  // Only enable in production where HTTPS is terminated by the reverse proxy.
  COOKIE_SECURE: boolFromString.default(false),
  // Seed-only credentials for the initial admin account.
  ADMIN_EMAIL: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().default('SSGG_admin_2410'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('Configuración de entorno inválida:');
  for (const issue of parsed.error.issues) {
    // eslint-disable-next-line no-console
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

// Validated, fully typed configuration object used across the backend.
export const env = parsed.data;
