// File: frontend/src/components/Bracket.tsx
// Purpose: Render the knockout bracket (eliminatorias) for the Estadísticas
// "Llaves" view.
// Functionality: Fetches the bracket via `useBracket` and renders a single
// column-per-round tree with connector curves at every breakpoint. The tree
// is what conveys a team's path and its possible future crossings, so on
// mobile it stays a tree and simply scrolls horizontally to follow a branch,
// instead of a calendar-ordered list that hides the bracket structure.
// Role: Used by EstadisticasScreen's "Llaves" tab.

import { Card } from './Card';
import { useBracket, type BracketMatch, type BracketRound } from '../hooks/useTournament';
import { formatShortDate, formatTime } from '../lib/dateFormat';

// Code of the "Por definir" placeholder team. When both sides are TBD the card
// shows a plain "TBD" instead of two empty team rows.
const TBD_CODE = 'TBD';

// Desktop bracket geometry (px). Each round divides the same total height into
// N equal slots and centres its card inside its slot, so a card in round r+1
// lands exactly between the two cards that feed it — exact tree centring
// regardless of card height. COL_W/GAP are wide enough to use the screen width
// and leave room for the connector curves drawn in the gaps.
const COL_W = 224; // matches the previous w-56 column width
const GAP = 72; // horizontal separation between rounds (was gap-4 = 16px)
const ROW = 104; // slot height for the largest (first) round

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

  // Drop rounds with no matches loaded so they don't create empty columns or
  // divide-by-zero slots.
  const rounds = bracket.data.rounds.filter((r) => r.matches.length > 0);
  if (rounds.length === 0) {
    return (
      <Card>
        <div className="px-4 py-8 text-center text-sm text-muted">
          Todavía no hay llaves cargadas.
        </div>
      </Card>
    );
  }

  return <BracketTree rounds={rounds} thirdPlace={bracket.data.thirdPlace} />;
}

// One column per round laid out as a real tree, used at every breakpoint. Every
// round splits the same `totalHeight` into N equal slots and centres its card
// in its slot, so a card sits exactly between the two that feed it. Connector
// curves are drawn in the gaps between rounds whenever a round halves cleanly
// into a multi-match next round (the 32→16→8→4→2 main path). The whole tree
// lives in a single 2-axis scroll box so the round headers can stay pinned to
// the top while the user scrolls down a long branch; on mobile this also lets
// them pan horizontally to follow any team's path. A faint dashed line marks
// the split between the two halves of the bracket (mobile only). The
// third-place match, when present, is shown on its own below the tree.
function BracketTree({ rounds, thirdPlace }: { rounds: BracketRound[]; thirdPlace: BracketMatch | null }) {
  const maxCount = Math.max(...rounds.map((r) => r.matches.length));
  const totalHeight = maxCount * ROW;
  const slotFor = (round: BracketRound) => totalHeight / round.matches.length;

  return (
    <div>
      <div className="overflow-auto max-h-[74vh]">
        <div className="w-max pb-2">
          {/* Round headers, pinned to the top of the scroll box on scroll. */}
          <div className="sticky top-0 z-20 flex bg-surface-alt">
            {rounds.map((round, i) => (
              <div key={round.id} className="flex">
                <div
                  className="py-1.5 text-center text-xs font-extrabold tracking-wider text-brand-navy"
                  style={{ width: COL_W }}
                >
                  {round.name}
                </div>
                {i < rounds.length - 1 && <div style={{ width: GAP }} />}
              </div>
            ))}
          </div>

          {/* Columns + connector gaps. */}
          <div className="relative mt-3 flex" style={{ height: totalHeight }}>
            {/* Subtle separator between the bracket's two halves (mobile). */}
            <div
              className="sm:hidden pointer-events-none absolute inset-x-0 border-t border-dashed border-brand-navy/15"
              style={{ top: totalHeight / 2 }}
              aria-hidden="true"
            />
            {rounds.map((round, i) => {
              const next = rounds[i + 1];
              const hasConnectors =
                next && next.matches.length >= 2 && round.matches.length === 2 * next.matches.length;
              return (
                <div key={round.id} className="flex">
                  <div className="flex flex-col" style={{ width: COL_W }}>
                    {round.matches.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center"
                        style={{ height: slotFor(round) }}
                      >
                        <div className="w-full">
                          <MatchCard match={m} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {i < rounds.length - 1 && (
                    <div style={{ width: GAP }}>
                      {hasConnectors && (
                        <Connectors
                          count={next.matches.length}
                          slot={slotFor(round)}
                          height={totalHeight}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Third-place match, off the main semifinal→final path. */}
      {thirdPlace && (
        <div className="mt-5">
          <div className="mb-2 text-center text-xs font-extrabold tracking-wider text-brand-navy">
            TERCER PUESTO
          </div>
          <div className="mx-auto" style={{ width: COL_W }}>
            <MatchCard match={thirdPlace} />
          </div>
        </div>
      )}
    </div>
  );
}

// Connector curves drawn in the gap between a round and the next. `count` is the
// number of target matches; each target is fed by two source cards. `slot` is
// the source round's slot height, so source centres are at (k+0.5)·slot and the
// merged target centre at the midpoint of its two sources.
function Connectors({ count, slot, height }: { count: number; slot: number; height: number }) {
  const cx = GAP / 2;
  return (
    <svg width={GAP} height={height} className="overflow-visible" aria-hidden="true">
      {Array.from({ length: count }, (_, j) => {
        const topY = (2 * j + 0.5) * slot;
        const bottomY = (2 * j + 1.5) * slot;
        const midY = (2 * j + 1) * slot;
        return (
          <g key={j}>
            <path
              d={`M0,${topY} C${cx},${topY} ${cx},${midY} ${GAP},${midY}`}
              fill="none"
              stroke="var(--brand-orange)"
              strokeOpacity={0.45}
              strokeWidth={2}
              strokeLinecap="round"
            />
            <path
              d={`M0,${bottomY} C${cx},${bottomY} ${cx},${midY} ${GAP},${midY}`}
              fill="none"
              stroke="var(--brand-orange)"
              strokeOpacity={0.45}
              strokeWidth={2}
              strokeLinecap="round"
            />
          </g>
        );
      })}
    </svg>
  );
}

// A single knockout match card.
function MatchCard({ match }: { match: BracketMatch }) {
  const finished = isFinished(match);
  const winner = winnerSide(match);
  // A match is still undecided when both sides are the TBD placeholder; show a
  // plain "TBD" instead of the FIFA slot label or two empty team rows.
  const undecided = match.homeTeam.code === TBD_CODE && match.awayTeam.code === TBD_CODE;

  return (
    <div className="rounded-xl border bg-surface px-3 py-2.5 shadow-sm">
      <div className="mb-1.5 text-[10px] font-semibold text-muted">
        {formatShortDate(match.scheduledAt)} · {formatTime(match.scheduledAt)}
      </div>
      {undecided ? (
        <div className="py-1 text-center text-xs font-semibold text-muted">TBD</div>
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
