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
  gdHitCount: number;
  winnerGoals: number;
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

// A single equipo member with the points they contribute within the scope
// (a given round or the overall total). Used to expand a team row.
export type TeamMember = {
  userId: number;
  name: string;
  points: number;
};

// By-team leaderboard rows (rule 9 — team prizes). `averagePoints` is the
// totalPoints divided by the equipo's current active members. `roster` is
// the per-member breakdown of `totalPoints`, sorted highest-first.
export type TeamStandingsRow = {
  position: number;
  equipo: string;
  members: number;
  totalPoints: number;
  averagePoints: number;
  roster: TeamMember[];
};

export type TeamRoundStandings = {
  roundId: number;
  roundName: string;
  orderIndex: number;
  teams: TeamStandingsRow[];
};

export type TeamStandingsResponse = {
  byRound: TeamRoundStandings[];
  total: TeamStandingsRow[];
};

// One match row inside a player's round history. `prediction` and `points`
// are null until the match has finished (the backend hides them).
export type UserHistoryMatch = {
  id: number;
  scheduledAt: string;
  homeTeam: { id: number; nameEs: string; code: string; flagEmoji: string };
  awayTeam: { id: number; nameEs: string; code: string; flagEmoji: string };
  status: string;
  homeGoals: number | null;
  awayGoals: number | null;
  isFinished: boolean;
  prediction: { homeGoals: number; awayGoals: number } | null;
  points: number | null;
  isExact: boolean;
};

export type UserRoundHistory = {
  user: { id: number; name: string };
  round: { id: number; name: string; orderIndex: number; isKnockout: boolean };
  matches: UserHistoryMatch[];
};

// Fetches a player's prediction history for one round. Disabled until both
// a user id and a round id are provided, which avoids spurious fetches
// while the modal is closed or before a default round is chosen.
export function useUserHistory(userId: number | null, roundId: number | null) {
  return useQuery({
    queryKey: ['tournament', 'user-history', userId, roundId],
    queryFn: () =>
      apiFetch<UserRoundHistory>(`/tournament/user-history?userId=${userId}&roundId=${roundId}`),
    enabled: userId !== null && roundId !== null,
  });
}

// One participant row in a match's predictions table. `prediction` is null
// when the user did not forecast the match (points is 0 then).
export type MatchPredictionRow = {
  userId: number;
  name: string;
  prediction: { homeGoals: number; awayGoals: number } | null;
  points: number;
  isExact: boolean;
};

export type MatchPredictionsResult = {
  match: {
    id: number;
    homeTeam: { id: number; nameEs: string; code: string; flagEmoji: string };
    awayTeam: { id: number; nameEs: string; code: string; flagEmoji: string };
    homeGoals: number | null;
    awayGoals: number | null;
    isFinished: boolean;
    // True once predictions are locked (15 min before kickoff). Rows are
    // revealed from this point on; points only matter once `isFinished`.
    isLocked: boolean;
  };
  rows: MatchPredictionRow[];
};

// Fetches every participant's prediction for one finished match. Disabled
// until a match id is provided, so the modal does not fetch while closed.
export function useMatchPredictions(matchId: number | null) {
  return useQuery({
    queryKey: ['tournament', 'match-predictions', matchId],
    queryFn: () =>
      apiFetch<MatchPredictionsResult>(`/tournament/match-predictions?matchId=${matchId}`),
    enabled: matchId !== null,
  });
}

export function useStandings() {
  return useQuery({
    queryKey: ['tournament', 'standings'],
    queryFn: () => apiFetch<{ standings: StandingsRow[] }>('/tournament/standings'),
    select: (data) => data.standings,
  });
}

export function useTeamStandings() {
  return useQuery({
    queryKey: ['tournament', 'team-standings'],
    queryFn: () => apiFetch<TeamStandingsResponse>('/tournament/team-standings'),
  });
}

export function useGroups() {
  return useQuery({
    queryKey: ['tournament', 'groups'],
    queryFn: () => apiFetch<{ groups: GroupTable[] }>('/tournament/groups'),
    select: (data) => data.groups,
  });
}

// One team side of a bracket match. Equal to `MatchTeam` but kept separate
// so the bracket types read independently.
export type BracketTeam = { id: number; nameEs: string; code: string; flagEmoji: string };

// One knockout match. `placeholderLabel` (e.g. "W89 vs W90") is shown instead
// of the team rows while both sides are still the "Por definir" (TBD) team.
export type BracketMatch = {
  id: number;
  scheduledAt: string;
  homeTeam: BracketTeam;
  awayTeam: BracketTeam;
  homeGoals: number | null;
  awayGoals: number | null;
  status: string;
  placeholderLabel: string | null;
  winnerByPenaltiesTeamId: number | null;
};

export type BracketRound = {
  id: number;
  name: string;
  orderIndex: number;
  matches: BracketMatch[];
};

// `rounds` is the main path (Dieciseisavos → … → Final, ordered to match the
// real bracket topology); `thirdPlace` is the consolation match, if any.
export type BracketResult = { rounds: BracketRound[]; thirdPlace: BracketMatch | null };

export function useBracket() {
  return useQuery({
    queryKey: ['tournament', 'bracket'],
    queryFn: () => apiFetch<BracketResult>('/tournament/bracket'),
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
