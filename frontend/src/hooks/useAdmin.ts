// File: frontend/src/hooks/useAdmin.ts
// Purpose: React Query hooks for the admin endpoints.
// Functionality: Lists / creates / updates / deactivates users, and lists
// / updates / sets results on matches. Every mutation invalidates the
// relevant caches so downstream screens reflect the change immediately.
// Role: Consumed by the admin Usuarios and Resultados screens.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiClient';

// ---------- Users ----------------------------------------------------------

export type AdminUserRow = {
  id: number;
  nombre: string;
  apellido: string;
  cuil: string;
  email: string;
  equipo: string | null;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  joinedRound: { id: number; name: string; orderIndex: number } | null;
};

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => apiFetch<{ users: AdminUserRow[] }>('/admin/users'),
    select: (d) => d.users,
  });
}

export type CreateUserBody = {
  nombre: string;
  apellido: string;
  cuil: string;
  email: string;
  password: string;
  equipo?: string;
  isAdmin?: boolean;
};

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateUserBody) =>
      apiFetch<{ user: AdminUserRow }>('/admin/users', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export type UpdateUserBody = Partial<{
  nombre: string;
  apellido: string;
  cuil: string;
  email: string;
  password: string;
  // `null` clears an existing equipo; `string` sets/updates it.
  equipo: string | null;
  isAdmin: boolean;
  isActive: boolean;
}>;

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: number } & UpdateUserBody) =>
      apiFetch<{ user: AdminUserRow }>(`/admin/users/${id}`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useDeactivateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/admin/users/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

// ---------- Login audit ----------------------------------------------------

export type LoginEventRow = {
  id: number;
  ipAddress: string;
  userAgent: string | null;
  createdAt: string;
  user: { id: number; nombre: string; apellido: string; email: string };
};

export type LoginEventsPage = {
  events: LoginEventRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

// Fetches one 100-row page of login events (newest first). `keepPreviousData`
// avoids a flash of empty state while paging back and forth.
export function useAdminLogins(page: number) {
  return useQuery({
    queryKey: ['admin', 'logins', page],
    queryFn: () => apiFetch<LoginEventsPage>(`/admin/logins?page=${page}`),
    placeholderData: (prev) => prev,
  });
}

// ---------- Matches --------------------------------------------------------

export type AdminMatchRow = {
  id: number;
  scheduledAt: string;
  kickoffAt: string | null;
  homeGoals: number | null;
  awayGoals: number | null;
  status: string;
  isKnockout: boolean;
  resolvedAdministratively: boolean;
  placeholderLabel: string | null;
  homeTeam: { id: number; nameEs: string; code: string; flagEmoji: string };
  awayTeam: { id: number; nameEs: string; code: string; flagEmoji: string };
  round: { id: number; name: string; orderIndex: number };
  countsForRound: { id: number; name: string; orderIndex: number };
};

export function useAdminMatches(roundId: number | null) {
  return useQuery({
    queryKey: ['admin', 'matches', roundId],
    queryFn: () =>
      apiFetch<{ matches: AdminMatchRow[] }>(
        roundId ? `/admin/matches?roundId=${roundId}` : '/admin/matches',
      ),
    enabled: roundId !== null,
    select: (d) => d.matches,
  });
}

export type SetResultBody = {
  homeGoals: number;
  awayGoals: number;
};

export function useSetMatchResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ matchId, ...body }: { matchId: number } & SetResultBody) =>
      apiFetch<{ ok: true }>(`/admin/matches/${matchId}/result`, {
        method: 'PUT',
        body,
      }),
    onSuccess: () => {
      // Any cached view of matches, standings or predictions may have
      // become stale because of the recomputation.
      qc.invalidateQueries({ queryKey: ['admin', 'matches'] });
      qc.invalidateQueries({ queryKey: ['tournament'] });
      qc.invalidateQueries({ queryKey: ['predictions'] });
    },
  });
}

// Wipes a previously-stored result so the admin can recover from a typo or
// from posting a score for a match that didn't actually happen.
export function useDeleteMatchResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (matchId: number) =>
      apiFetch<void>(`/admin/matches/${matchId}/result`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'matches'] });
      qc.invalidateQueries({ queryKey: ['tournament'] });
      qc.invalidateQueries({ queryKey: ['predictions'] });
    },
  });
}

export type PatchMatchBody = Partial<{
  scheduledAt: string;
  countsForRoundId: number;
  homeTeamId: number;
  awayTeamId: number;
  status: 'scheduled' | 'finished' | 'postponed' | 'cancelled';
  resolvedAdministratively: boolean;
}>;

export function usePatchMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ matchId, ...body }: { matchId: number } & PatchMatchBody) =>
      apiFetch<{ ok: true }>(`/admin/matches/${matchId}`, { method: 'PATCH', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'matches'] });
      qc.invalidateQueries({ queryKey: ['tournament'] });
      qc.invalidateQueries({ queryKey: ['predictions'] });
    },
  });
}

// ---------- Teams ----------------------------------------------------------

export type AdminTeamRow = {
  id: number;
  nameEs: string;
  code: string;
  flagEmoji: string;
  group: { name: string } | null;
};

// Full roster used by the playoff team-picker. Cached aggressively because
// teams essentially never change after the seed.
export function useAdminTeams() {
  return useQuery({
    queryKey: ['admin', 'teams'],
    queryFn: () => apiFetch<{ teams: AdminTeamRow[] }>('/admin/teams'),
    select: (d) => d.teams,
    staleTime: 5 * 60 * 1000,
  });
}
