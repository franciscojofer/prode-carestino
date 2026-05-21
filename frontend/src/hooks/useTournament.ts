// File: frontend/src/hooks/useTournament.ts
// Purpose: React Query hooks for the read-only tournament endpoints.
// Functionality: Wraps `/api/tournament/*` so screens consume strongly
// typed data without thinking about caching, fetching or error handling.
// Role: Imported by `TorneoScreen`, `EstadisticasScreen`, `FixtureScreen`
// and the predictions screen for the round selector.

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/apiClient';

// Shapes match the JSON the backend returns. Kept inline to avoid a
// shared types package — the surface area is small and these are the
// only consumers.

export type StandingsRow = {
  position: number;
  userId: number;
  name: string;
  totalPoints: number;
  exactCount: number;
};

export type TournamentRound = {
  id: number;
  name: string;
  orderIndex: number;
  startsAt: string;
  endsAt: string | null;
  isKnockout: boolean;
};

export type GroupTeam = {
  teamId: number;
  name: string;
  code: string;
  flagEmoji: string;
  pj: number;
  g: number;
  e: number;
  p: number;
  gf: number;
  ga: number;
  dg: number;
  pts: number;
};

export type GroupTable = {
  id: number;
  name: string;
  teams: GroupTeam[];
};

export function useStandings() {
  return useQuery({
    queryKey: ['tournament', 'standings'],
    queryFn: () => apiFetch<{ standings: StandingsRow[] }>('/tournament/standings'),
    select: (data) => data.standings,
  });
}

export function useGroups() {
  return useQuery({
    queryKey: ['tournament', 'groups'],
    queryFn: () => apiFetch<{ groups: GroupTable[] }>('/tournament/groups'),
    select: (data) => data.groups,
  });
}

export function useRounds() {
  return useQuery({
    queryKey: ['tournament', 'rounds'],
    queryFn: () => apiFetch<{ rounds: TournamentRound[] }>('/tournament/rounds'),
    select: (data) => data.rounds,
  });
}

export function useCurrentRound() {
  return useQuery({
    queryKey: ['tournament', 'current-round'],
    queryFn: () =>
      apiFetch<{ round: TournamentRound | null }>('/tournament/current-round'),
    select: (data) => data.round,
  });
}
