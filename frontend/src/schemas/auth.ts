// File: frontend/src/schemas/auth.ts
// Purpose: Zod schemas for the login and register forms.
// Functionality: Mirrors the backend validators so the user gets instant
// feedback before any network request. All messages are in
// Spanish-Argentina to match the UI.
// Role: Imported by `LoginScreen` and `RegisterScreen` and fed into
// `react-hook-form` via `@hookform/resolvers/zod`.

import { z } from 'zod';

// Login email accepts the literal "admin" plus any valid email — same
// exception the backend honours for the seeded administrator account.
const loginEmail = z
  .string()
  .trim()
  .min(1, 'El email es obligatorio')
  .refine((v) => v === 'admin' || z.string().email().safeParse(v).success, {
    message: 'Email inválido',
  });

export const loginSchema = z.object({
  email: loginEmail,
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// Register email requires real email format and forbids the reserved
// "admin" handle.
const registerEmail = z
  .string()
  .trim()
  .min(1, 'El email es obligatorio')
  .email('Email inválido')
  .refine((v) => v !== 'admin', { message: 'Email reservado' });

// CUIL: 11 digits, dashes optional. The backend normalises the canonical
// form; the frontend just verifies the digit count.
const cuilField = z
  .string()
  .trim()
  .refine((v) => /^\d{11}$/.test(v.replace(/[-\s]/g, '')), {
    message: 'CUIL debe tener 11 dígitos',
  });

// Same policy as the backend: 8+ chars with at least one letter and digit.
const passwordField = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .refine((v) => /[a-zA-Z]/.test(v), 'Debe incluir al menos una letra')
  .refine((v) => /\d/.test(v), 'Debe incluir al menos un número');

export const registerSchema = z
  .object({
    nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(50),
    apellido: z.string().trim().min(1, 'El apellido es obligatorio').max(50),
    cuil: cuilField,
    email: registerEmail,
    password: passwordField,
    passwordConfirm: z.string().min(1, 'Repetí la contraseña'),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirm'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
