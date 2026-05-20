// File: backend/src/modules/auth/auth.schemas.ts
// Purpose: Zod schemas that validate input payloads for the auth endpoints.
// Functionality: Defines reusable field validators (email, password, CUIL)
// and composes them into the `registerSchema` and `loginSchema` used by the
// routes. User-facing messages are in Spanish (Argentina) per product spec.
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

// Register requires a real email; "admin" is rejected so it remains exclusive
// to the seeded admin account.
const registerEmail = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'El email es obligatorio')
  .email('Email inválido')
  .refine((v) => v !== 'admin', { message: 'Email reservado' });

// Password policy: minimum 8 chars, at least one letter and one digit.
// Stricter rules were considered but rejected as too much friction for a
// short-lived internal tournament.
const passwordField = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .refine((v) => /[a-zA-Z]/.test(v), 'La contraseña debe incluir al menos una letra')
  .refine((v) => /\d/.test(v), 'La contraseña debe incluir al menos un número');

// CUIL = Argentine taxpayer ID. Accepts input with or without dashes/spaces,
// then normalizes to the canonical `XX-XXXXXXXX-X` shape before storing.
const cuilField = z
  .string()
  .trim()
  .transform((v) => v.replace(/[-\s]/g, ''))
  .pipe(z.string().regex(/^\d{11}$/, 'CUIL debe tener 11 dígitos'))
  .transform((v) => `${v.slice(0, 2)}-${v.slice(2, 10)}-${v.slice(10)}`);

export const registerSchema = z
  .object({
    nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(50),
    apellido: z.string().trim().min(1, 'El apellido es obligatorio').max(50),
    cuil: cuilField,
    email: registerEmail,
    password: passwordField,
    passwordConfirm: z.string(),
  })
  // Cross-field check: both password fields must match.
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirm'],
  });

export const loginSchema = z.object({
  email: loginEmail,
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
