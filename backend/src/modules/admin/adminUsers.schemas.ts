// File: backend/src/modules/admin/adminUsers.schemas.ts
// Purpose: Zod validators for the admin-only user management endpoints.
// Functionality: Reuses the same email/password/CUIL rules as the public
// register endpoint but exposes `isAdmin` and `isActive` so the admin can
// promote, demote, deactivate or reactivate users from the panel.
// Role: Imported by `adminUsers.routes.ts`.

import { z } from 'zod';

// Same rules as the public register endpoint: minimum 8 chars, must
// contain at least one letter and one digit.
const passwordField = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .refine((v) => /[a-zA-Z]/.test(v), 'La contraseña debe incluir al menos una letra')
  .refine((v) => /\d/.test(v), 'La contraseña debe incluir al menos un número');

// Reserves the literal "admin" for the seeded administrator account.
const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'El email es obligatorio')
  .email('Email inválido')
  .refine((v) => v !== 'admin', { message: 'Email reservado' });

// Accepts CUIL with or without dashes; normalises to XX-XXXXXXXX-X.
const cuilField = z
  .string()
  .trim()
  .transform((v) => v.replace(/[-\s]/g, ''))
  .pipe(z.string().regex(/^\d{11}$/, 'CUIL debe tener 11 dígitos'))
  .transform((v) => `${v.slice(0, 2)}-${v.slice(2, 10)}-${v.slice(10)}`);

export const createUserSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(50),
  apellido: z.string().trim().min(1, 'El apellido es obligatorio').max(50),
  cuil: cuilField,
  email: emailField,
  password: passwordField,
  isAdmin: z.boolean().optional().default(false),
});

// All fields optional — the admin can update any subset, including the
// password (which gets re-hashed if present).
export const updateUserSchema = z
  .object({
    nombre: z.string().trim().min(1).max(50).optional(),
    apellido: z.string().trim().min(1).max(50).optional(),
    cuil: cuilField.optional(),
    email: emailField.optional(),
    password: passwordField.optional(),
    isAdmin: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'No hay cambios para aplicar',
  });

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
