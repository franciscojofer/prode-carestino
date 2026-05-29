// File: backend/src/modules/auth/auth.schemas.ts
// Purpose: Zod schemas that validate input payloads for the auth endpoints.
// Functionality: Defines the login email validator and exposes
// `loginSchema` used by the routes. User-facing messages are in Spanish
// (Argentina) per product spec.
// Role: Imported by `auth.routes.ts` to parse and validate request bodies
// before they reach the service layer.

import { z } from 'zod';

// Login accepts any valid email OR the literal "admin", which is the
// reserved login of the seeded administrator (rule from section 7).
const loginEmail = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'El email es obligatorio')
  .refine((v) => v === 'admin' || z.string().email().safeParse(v).success, {
    message: 'Email inválido',
  });

export const loginSchema = z.object({
  email: loginEmail,
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export type LoginInput = z.infer<typeof loginSchema>;
