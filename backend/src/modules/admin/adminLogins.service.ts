// File: backend/src/modules/admin/adminLogins.service.ts
// Purpose: Business logic for the admin login-audit panel.
// Functionality: Returns a page of login events (newest first) together with
// the basic owner data, plus the total count so the UI can paginate.
// Role: Called by `adminLogins.routes.ts`.

import type { Prisma as PrismaClient } from '../../lib/db';

// How many rows the admin sees per page. Fixed at 100 to match the panel UI.
export const LOGINS_PAGE_SIZE = 100;

// One login-audit row enriched with the owning user's identity.
export type LoginEventRow = {
  id: number;
  ipAddress: string;
  userAgent: string | null;
  createdAt: Date;
  user: { id: number; nombre: string; apellido: string; email: string };
};

// Paginated response envelope returned to the admin panel.
export type LoginEventsPage = {
  events: LoginEventRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

// Fetches one page of login events ordered newest-first.
// Inputs: prisma client and the 1-based page number.
// Output: the requested slice plus pagination metadata.
export async function listLoginEvents(
  prisma: PrismaClient,
  page: number,
): Promise<LoginEventsPage> {
  const [total, events] = await Promise.all([
    prisma.loginEvent.count(),
    prisma.loginEvent.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * LOGINS_PAGE_SIZE,
      take: LOGINS_PAGE_SIZE,
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        user: { select: { id: true, nombre: true, apellido: true, email: true } },
      },
    }),
  ]);

  return {
    events,
    page,
    pageSize: LOGINS_PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / LOGINS_PAGE_SIZE)),
  };
}
