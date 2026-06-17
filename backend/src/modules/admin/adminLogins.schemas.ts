// File: backend/src/modules/admin/adminLogins.schemas.ts
// Purpose: Zod validators for the admin login-audit endpoint.
// Functionality: Parses the `?page=` query param, coercing the string from
// the URL into a positive integer with a sane default.
// Role: Imported by `adminLogins.routes.ts`.

import { z } from 'zod';

// Query for `GET /admin/logins`. `page` is 1-based; missing or invalid values
// fall back to the first page.
export const loginsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

export type LoginsQuery = z.infer<typeof loginsQuerySchema>;
