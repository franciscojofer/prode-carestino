// File: frontend/src/schemas/admin.ts
// Purpose: Zod schemas for the admin user create / edit forms.
// Functionality: Mirrors the backend validators so the form catches every
// rejection client-side. The edit schema allows empty password (meaning
// "don't reset") and makes every field optional.
// Role: Imported by the AdminUsuariosScreen modal forms.

import { z } from 'zod';

const passwordRules = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .refine((v) => /[a-zA-Z]/.test(v), 'Debe incluir al menos una letra')
  .refine((v) => /\d/.test(v), 'Debe incluir al menos un número');

const emailField = z
  .string()
  .trim()
  .min(1, 'El email es obligatorio')
  .email('Email inválido')
  .refine((v) => v !== 'admin', { message: 'Email reservado' });

const cuilField = z
  .string()
  .trim()
  .refine((v) => /^\d{11}$/.test(v.replace(/[-\s]/g, '')), {
    message: 'CUIL debe tener 11 dígitos',
  });

const nameField = (label: string) =>
  z.string().trim().min(1, `${label} es obligatorio`).max(50);

// Work-team label. Same rules as the backend: free text, capped, normalised
// to lowercase. Optional so blank input stays blank.
const equipoField = z
  .string()
  .trim()
  .toLowerCase()
  .max(30, 'El equipo no puede superar 30 caracteres');

export const adminCreateUserSchema = z.object({
  nombre: nameField('El nombre'),
  apellido: nameField('El apellido'),
  cuil: cuilField,
  email: emailField,
  password: passwordRules,
  equipo: equipoField.optional(),
  isAdmin: z.boolean().default(false),
});
export type AdminCreateUserValues = z.infer<typeof adminCreateUserSchema>;

// Edit schema: every field optional. The password field accepts an empty
// string (left alone) or a valid password — the union avoids forcing the
// admin to type a new password every time they tweak the name.
export const adminEditUserSchema = z.object({
  nombre: nameField('El nombre').optional(),
  apellido: nameField('El apellido').optional(),
  cuil: cuilField.optional(),
  email: emailField.optional(),
  password: z.union([z.literal(''), passwordRules]).optional(),
  equipo: equipoField.optional(),
  isAdmin: z.boolean().optional(),
  isActive: z.boolean().optional(),
});
export type AdminEditUserValues = z.infer<typeof adminEditUserSchema>;
