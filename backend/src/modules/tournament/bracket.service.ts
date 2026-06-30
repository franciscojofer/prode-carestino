// File: backend/src/modules/tournament/bracket.service.ts
// Purpose: Expose the knockout bracket (eliminatorias) for the Estadísticas
// "Llaves" view.
// Functionality: Returns every knockout round (isKnockout = true) with its
// matches ordered to match the real bracket topology — not by kickoff time.
// The pairing is derived from each match's FIFA slot label ("W89 vs W90"),
// which references the feeder matches by their number (equal to the match id
// in the seeded fixture). Matches are positioned so that, in every round, the
// two cards at indexes 2k / 2k+1 feed the next round's card k — exactly what
// the frontend tree assumes. The third-place match (fed by the semifinal
// losers, "RU101 vs RU102") is returned separately so it does not sit on the
// main semifinal→final path.
// Role: Backs GET /api/tournament/bracket. Read-only; memoized like the other
// tournament read endpoints to absorb post-result traffic.

import type { Prisma } from '../../lib/db';
import { cached, invalidate } from '../../lib/cache';

// Cache key + TTL for the bracket. Same short TTL as standings/groups so a
// freshly-posted knockout result surfaces almost immediately.
const BRACKET_CACHE_KEY = 'tournament:bracket';
const BRACKET_TTL_MS = 5_000;

// Called by admin write paths whenever a knockout score or pairing may have
// changed so the next /bracket request rebuilds the tree.
export function invalidateBracketCache(): void {
  invalidate(BRACKET_CACHE_KEY);
}

// Team shape embedded in each side of a bracket match.
type BracketTeam = { id: number; nameEs: string; code: string; flagEmoji: string };

// One knockout match. `placeholderLabel` holds the FIFA slot text
// ("W89 vs W90") used to derive the bracket topology and by the UI.
export type BracketMatch = {
  id: number;
  scheduledAt: Date;
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

// `rounds` is the main path Dieciseisavos → … → Final (third place excluded).
// `thirdPlace` is the consolation match, or null when the fixture has none.
export type BracketResult = { rounds: BracketRound[]; thirdPlace: BracketMatch | null };

// Returns the knockout bracket. Memoized in process memory for BRACKET_TTL_MS;
// admin write paths must call `invalidateBracketCache()` to publish changes.
// Inputs: prisma client. Output: ordered rounds with their matches.
export function getBracket(prisma: Prisma): Promise<BracketResult> {
  return cached(BRACKET_CACHE_KEY, BRACKET_TTL_MS, () => computeBracket(prisma));
}

// Feeder match numbers a match advances FROM, parsed from the "W<n>" tokens in
// its slot label. Group-stage placeholders ("1A vs 2B") yield none, so those
// matches are tree leaves.
function winnerFeeders(label: string | null): number[] {
  if (!label) return [];
  return Array.from(label.matchAll(/W(\d+)/g), (m) => Number(m[1]));
}

// A consolation (third-place) match is fed by losers/runners-up ("RU"/"L"
// tokens) and never by winners. Used to keep it off the main bracket path.
function isConsolationLabel(label: string | null): boolean {
  if (!label) return false;
  return /(?:RU|L)\d+/.test(label) && !/W\d+/.test(label);
}

async function computeBracket(prisma: Prisma): Promise<BracketResult> {
  const rounds = await prisma.tournamentRound.findMany({
    where: { isKnockout: true },
    orderBy: { orderIndex: 'asc' },
    select: {
      id: true,
      name: true,
      orderIndex: true,
      matches: {
        orderBy: { scheduledAt: 'asc' },
        select: {
          id: true,
          scheduledAt: true,
          homeGoals: true,
          awayGoals: true,
          status: true,
          placeholderLabel: true,
          winnerByPenaltiesTeamId: true,
          homeTeam: { select: { id: true, nameEs: true, code: true, flagEmoji: true } },
          awayTeam: { select: { id: true, nameEs: true, code: true, flagEmoji: true } },
        },
      },
    },
  });

  // Flatten every knockout match so feeders (which may live in another round)
  // can be resolved by id.
  const matchById = new Map<number, { label: string | null }>();
  for (const r of rounds) {
    for (const m of r.matches) matchById.set(m.id, { label: m.placeholderLabel });
  }

  // Resolved winner-feeders for a match: only those that point at a real,
  // different knockout match (guards self-references from data typos).
  const feedersOf = (id: number): number[] =>
    winnerFeeders(matchById.get(id)?.label ?? null).filter(
      (f) => f !== id && matchById.has(f),
    );

  // Find the main bracket root (the Final): a non-consolation match that no
  // other non-consolation match feeds into.
  const referenced = new Set<number>();
  for (const r of rounds) {
    for (const m of r.matches) {
      if (isConsolationLabel(m.placeholderLabel)) continue;
      for (const f of feedersOf(m.id)) referenced.add(f);
    }
  }
  const roots = rounds
    .flatMap((r) => r.matches.map((m) => ({ id: m.id, orderIndex: r.orderIndex, label: m.placeholderLabel })))
    .filter((m) => !isConsolationLabel(m.label) && !referenced.has(m.id))
    .sort((a, b) => b.orderIndex - a.orderIndex);
  const rootId = roots[0]?.id ?? null;

  // Depth-first walk from the Final assigns each leaf (first-round match) a
  // top-to-bottom sequence number, following feeders in label order.
  const leafSeq = new Map<number, number>();
  let seq = 0;
  const seen = new Set<number>();
  const assignLeafSeq = (id: number): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const fs = feedersOf(id);
    if (fs.length === 0) {
      leafSeq.set(id, seq++);
      return;
    }
    for (const f of fs) assignLeafSeq(f);
  };
  if (rootId !== null) assignLeafSeq(rootId);

  // Each match's sort key is the smallest leaf sequence in its subtree, so a
  // round sorted by it lays out exactly between the cards that feed it.
  const sortKeyMemo = new Map<number, number>();
  const sortKeyOf = (id: number): number => {
    const cached = sortKeyMemo.get(id);
    if (cached !== undefined) return cached;
    const fs = feedersOf(id);
    const value =
      fs.length === 0
        ? leafSeq.get(id) ?? Number.MAX_SAFE_INTEGER
        : Math.min(...fs.map(sortKeyOf));
    sortKeyMemo.set(id, value);
    return value;
  };

  const toBracketMatch = (m: (typeof rounds)[number]['matches'][number]): BracketMatch => ({
    id: m.id,
    scheduledAt: m.scheduledAt,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeGoals: m.homeGoals,
    awayGoals: m.awayGoals,
    status: m.status,
    placeholderLabel: m.placeholderLabel,
    winnerByPenaltiesTeamId: m.winnerByPenaltiesTeamId,
  });

  // Split off the third-place round(s) so the main path is semifinal → final.
  let thirdPlace: BracketMatch | null = null;
  const mainRounds: BracketRound[] = [];
  for (const r of rounds) {
    const isThirdPlace =
      r.name.toLowerCase().includes('tercer') ||
      (r.matches.length > 0 && r.matches.every((m) => isConsolationLabel(m.placeholderLabel)));
    if (isThirdPlace) {
      if (!thirdPlace && r.matches.length > 0) thirdPlace = toBracketMatch(r.matches[0]);
      continue;
    }
    const matches = r.matches
      .map(toBracketMatch)
      .sort(
        (a, b) =>
          sortKeyOf(a.id) - sortKeyOf(b.id) ||
          a.scheduledAt.getTime() - b.scheduledAt.getTime(),
      );
    mainRounds.push({ id: r.id, name: r.name, orderIndex: r.orderIndex, matches });
  }

  return { rounds: mainRounds, thirdPlace };
}
