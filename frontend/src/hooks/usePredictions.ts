// File: frontend/src/hooks/usePredictions.ts
// Purpose: React Query hooks for the predictions and fixture endpoints.
// Functionality: Reads predictions for the active or a chosen round,
// reads a round's fixture, and submits the user's prediction via PUT
// (with optimistic invalidation so the UI re-syncs immediately).
// Role: Consumed by the Predicciones and Fixture screens.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiClient';

// Shapes match the backend response. Kept in this module so the screens
// don't depend on `apiClient` directly.

export type MatchTeam = {
  id: number;
  nameEs: string;
  code: string;
  flagEmoji: string;
};

export type RoundSummary = {
  id: number;
  name: string;
  orderIndex: number;
  isKnockout: boolean;
};

export type MatchWithPrediction = {
  id: number;
  scheduledAt: string;
  kickoffAt: string | null;
  homeTeam: MatchTeam;
  awayTeam: MatchTeam;
  homeGoals: number | null;
  awayGoals: number | null;
  status: string;
  isKnockout: boolean;
  resolvedAdministratively: boolean;
  isLocked: boolean;
  // Present in fixture responses only.
  placeholderLabel?: string | null;
  prediction: { homeGoals: number; awayGoals: number } | null;
};

export type PredictionsByRound = {
  round: RoundSummary | null;
  matches: MatchWithPrediction[];
};

// Returns the predictions for the round that is currently open for
// editing. When no round is active the API returns `{ round: null, matches: [] }`.
export function useCurrentPredictions() {
  return useQuery({
    queryKey: ['predictions', 'current'],
    queryFn: () => apiFetch<PredictionsByRound>('/predictions/current'),
  });
}

// Predictions for a specific round id. The hook is disabled until a real
// round id is passed, which avoids a spurious fetch on first render.
export function usePredictionsByRound(roundId: number | null) {
  return useQuery({
    queryKey: ['predictions', 'round', roundId],
    queryFn: () => apiFetch<PredictionsByRound>(`/predictions/round/${roundId}`),
    enabled: roundId !== null,
  });
}

// Read-only fixture for any round. Identical shape to the predictions
// endpoint so the Fixture screen can reuse the same components.
export function useFixture(roundId: number | null) {
  return useQuery({
    queryKey: ['tournament', 'fixture', roundId],
    queryFn: () => apiFetch<PredictionsByRound>(`/tournament/fixture?roundId=${roundId}`),
    enabled: roundId !== null,
  });
}

// Stores (creates or updates) the authenticated user's prediction for a
// single match. On success invalidates every cached predictions query so
// the new value is reflected immediately.
export function useSetPrediction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ matchId, homeGoals, awayGoals }: {
      matchId: number;
      homeGoals: number;
      awayGoals: number;
    }) =>
      apiFetch<{ ok: true }>(`/predictions/${matchId}`, {
        method: 'PUT',
        body: { homeGoals, awayGoals },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['predictions'] });
      queryClient.invalidateQueries({ queryKey: ['tournament', 'fixture'] });
    },
  });
}
