// File: frontend/src/hooks/useAuth.ts
// Purpose: Single source of truth for the authenticated user.
// Functionality: Wraps a `useQuery` on `/api/auth/me` (returns the user or
// null on 401) and exposes `login` and `logout` mutations that keep the
// cached user in sync. Public registration was removed once the payroll
// seed became the canonical source of accounts.
// Role: Any component that needs to know "who am I?" calls `useAuth()`.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from '../lib/apiClient';

export type AuthUser = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  isAdmin: boolean;
};

// Query key for the `/auth/me` cache entry. Exported so callers that want
// to manually invalidate (e.g. after an admin updates the current user)
// can reach it.
export const AUTH_ME_KEY = ['auth', 'me'] as const;

// Public hook. The `query` return value is intentionally NOT spread so
// that mutations and the user object stay in obvious, named slots.
export function useAuth() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: AUTH_ME_KEY,
    queryFn: async () => {
      try {
        const data = await apiFetch<{ user: AuthUser }>('/auth/me');
        return data.user;
      } catch (e) {
        // A 401 from /auth/me means "no session" — treat as a successful
        // resolution to `null` so consumers don't have to handle errors.
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    retry: false,
  });

  const login = useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      apiFetch<{ user: AuthUser }>('/auth/login', { method: 'POST', body: input }),
    onSuccess: (data) => {
      queryClient.setQueryData(AUTH_ME_KEY, data.user);
    },
  });

  const logout = useMutation({
    mutationFn: () => apiFetch<void>('/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(AUTH_ME_KEY, null);
      // Forget every cached query so the next login starts from a clean slate.
      queryClient.clear();
    },
  });

  return {
    user: query.data,
    isLoading: query.isLoading,
    error: query.error,
    login,
    logout,
  };
}
