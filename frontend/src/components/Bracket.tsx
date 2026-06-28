// File: frontend/src/components/Bracket.tsx
// Purpose: Render the knockout bracket (eliminatorias) for the Estadísticas
// "Llaves" view.
// Functionality: Fetches the bracket via `useBracket` and renders two
// responsive layouts from the same match card: a horizontal column-per-round
// tree on desktop (sm and up, with horizontal scroll when it overflows) and a
// vertical round selector — navigated with chevrons — on mobile, where a
// horizontal tree would be unreadable at ~390px.
// Role: Used by EstadisticasScreen's "Llaves" tab.

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from './Card';
import { useBracket, type BracketMatch, type BracketRound } from '../hooks/useTournament';
import { formatShortDate, formatTime } from '../lib/dateFormat';

// Code of the "Por definir" placeholder team. When both sides are TBD the card
// shows the FIFA slot label ("W89 vs W90") instead of two empty team rows.
const TBD_CODE = 'TBD';

// True once the match has a final score loaded.
function isFinished(m: BracketMatch): boolean {
  return m.status === 'finished' && m.homeGoals !== null && m.awayGoals !== null;
}

// Returns which side won a finished match: 'home', 'away' or null (no result /
// undecided). A 120-minute draw is broken by `winnerByPenaltiesTeamId`.
function winnerSide(m: BracketMatch): 'home' | 'away' | null {
  if (!isFinished(m)) return null;
  const h = m.homeGoals as number;
  const a = m.awayGoals as number;
  if (h > a) return 'home';
  if (a > h) return 'away';
  if (m.winnerByPenaltiesTeamId === m.homeTeam.id) return 'home';
  if (m.winnerByPenaltiesTeamId === m.awayTeam.id) return 'away';
  return null;
}

export function Bracket() {
  const bracket = useBracket();

  if (bracket.isLoading) {
    return (
      <Card>
        <div className="px-4 py-8 text-center text-sm text-muted">Cargando…</div>
      </Card>
    );
  }

  if (bracket.isError || !bracket.data) {
    return (
      <Card>
        <div className="px-4 py-8 text-center text-sm text-danger">
          No pudimos cargar las llaves. Reintentá en un momento.
        </div>
      </Card>
    );
  }

  const rounds = bracket.data;
  if (rounds.length === 0) {
    return (
      <Card>
        <div className="px-4 py-8 text-center text-sm text-muted">
          Todavía no hay llaves cargadas.
        </div>
      </Card>
    );
  }

  return (
    <>
      <DesktopBracket rounds={rounds} />
      <MobileBracket rounds={rounds} />
    </>
  );
}

// Desktop: one column per round, cards spread vertically (`justify-around`) so
// later, smaller rounds sit centred against the earlier ones — a tree shape
// without explicit connector lines. Scrolls horizontally if it overflows.
function DesktopBracket({ rounds }: { rounds: BracketRound[] }) {
  return (
    <div className="hidden sm:block overflow-x-auto">
      <div className="flex gap-4 min-w-max pb-2">
        {rounds.map((round) => (
          <div key={round.id} className="flex w-56 flex-col">
            <div className="mb-3 text-center text-xs font-extrabold tracking-wider text-brand-navy">
              {round.name}
            </div>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {round.matches.map((m) => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mobile: a chevron round selector (same pattern as the Fixture round
// selector) showing one round's matches as a vertical list.
function MobileBracket({ rounds }: { rounds: BracketRound[] }) {
  const [idx, setIdx] = useState(0);
  const safeIdx = Math.min(idx, rounds.length - 1);
  const round = rounds[safeIdx];
  const canPrev = safeIdx > 0;
  const canNext = safeIdx < rounds.length - 1;

  return (
    <div className="sm:hidden">
      <div className="mb-3 rounded-xl bg-surface px-3 py-2.5 flex items-center justify-between border">
        <button
          type="button"
          onClick={() => canPrev && setIdx(safeIdx - 1)}
          disabled={!canPrev}
          className="p-1 text-muted disabled:opacity-30 transition-transform active:scale-90"
          aria-label="Llave anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-sm font-bold text-ink truncate px-2">{round.name}</div>
        <button
          type="button"
          onClick={() => canNext && setIdx(safeIdx + 1)}
          disabled={!canNext}
          className="p-1 text-brand-orange disabled:opacity-30 transition-transform active:scale-90"
          aria-label="Llave siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="space-y-3">
        {round.matches.map((m) => (
          <MatchCard key={m.id} match={m} />
        ))}
      </div>
    </div>
  );
}

// A single knockout match card, shared by both layouts.
function MatchCard({ match }: { match: BracketMatch }) {
  const finished = isFinished(match);
  const winner = winnerSide(match);
  // A match is still undecided when both sides are the TBD placeholder; show
  // the FIFA slot label instead of two empty team rows.
  const undecided = match.homeTeam.code === TBD_CODE && match.awayTeam.code === TBD_CODE;

  return (
    <div className="rounded-xl border bg-surface px-3 py-2.5 shadow-sm">
      <div className="mb-1.5 text-[10px] font-semibold text-muted">
        {formatShortDate(match.scheduledAt)} · {formatTime(match.scheduledAt)}
      </div>
      {undecided && match.placeholderLabel ? (
        <div className="py-1 text-center text-xs font-semibold text-muted">
          {match.placeholderLabel}
        </div>
      ) : (
        <div className="space-y-1">
          <TeamLine
            flag={match.homeTeam.flagEmoji}
            name={match.homeTeam.nameEs}
            goals={match.homeGoals}
            showGoals={finished}
            isWinner={winner === 'home'}
          />
          <TeamLine
            flag={match.awayTeam.flagEmoji}
            name={match.awayTeam.nameEs}
            goals={match.awayGoals}
            showGoals={finished}
            isWinner={winner === 'away'}
          />
        </div>
      )}
    </div>
  );
}

type TeamLineProps = {
  flag: string;
  name: string;
  goals: number | null;
  showGoals: boolean;
  isWinner: boolean;
};

// One team row inside a match card. The winner is bold/orange; the loser is
// muted once a result exists.
function TeamLine({ flag, name, goals, showGoals, isWinner }: TeamLineProps) {
  const dimmed = showGoals && !isWinner;
  return (
    <div className="flex items-center gap-2">
      <span className="text-base leading-none">{flag}</span>
      <span
        className={`flex-1 truncate text-xs ${
          isWinner ? 'font-bold text-ink' : dimmed ? 'text-muted' : 'font-semibold text-ink'
        }`}
      >
        {name}
      </span>
      {showGoals && (
        <span
          className={`tabular-nums text-xs font-extrabold ${
            isWinner ? 'text-brand-orange' : 'text-muted'
          }`}
        >
          {goals}
        </span>
      )}
    </div>
  );
}
