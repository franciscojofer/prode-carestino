// File: frontend/src/schemas/auth.ts
// Purpose: Zod schema for the login form.
// Functionality: Mirrors the backend validator so the user gets instant
// feedback before any network request. All messages are in
// Spanish-Argentina to match the UI.
// Role: Imported by `LoginScreen` and fed into `react-hook-form` via
// `@hookform/resolvers/zod`.

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
