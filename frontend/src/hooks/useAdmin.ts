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
  winnerByPenaltiesTeamId: number | null;
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
  winnerByPenaltiesTeamId?: number | null;
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
