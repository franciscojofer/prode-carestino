// File: frontend/src/screens/FixtureScreen.tsx
// Purpose: Read-only fixture viewer.
// Functionality: Same round selector as Predicciones, but matches are
// grouped by day with a Spanish header ("Viernes, 12 de junio") and the
// pill in the middle shows the kickoff time. Finished matches show the
// real score; pending matches show the kickoff time.
// Role: Bound to /fixture behind ProtectedRoute.

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { MatchPredictionsModal } from '../components/MatchPredictionsModal';
import { useCurrentRound, useRounds } from '../hooks/useTournament';
import { useFixture, type MatchWithPrediction } from '../hooks/usePredictions';
import { formatTime, formatDayHeader, dayKey } from '../lib/dateFormat';

export function FixtureScreen() {
  const currentRound = useCurrentRound();
  const rounds = useRounds();
  const [roundId, setRoundId] = useState<number | null>(null);
  // Match whose per-participant predictions modal is open, or null when
  // closed. Any locked match (15 min before kickoff) can set this.
  const [openMatch, setOpenMatch] = useState<MatchWithPrediction | null>(null);

  useEffect(() => {
    if (roundId === null && currentRound.data) setRoundId(currentRound.data.id);
  }, [currentRound.data, roundId]);

  const fixture = useFixture(roundId);
  const orderedRounds = rounds.data ?? [];
  const idx = orderedRounds.findIndex((r) => r.id === roundId);
  const canPrev = idx > 0;
  const canNext = idx >= 0 && idx < orderedRounds.length - 1;

  // Bucket matches by Argentina-day so the day header changes when the
  // calendar day flips, no matter the kickoff hour.
  const buckets = (() => {
    const out: { day: string; matches: MatchWithPrediction[] }[] = [];
    for (const m of fixture.data?.matches ?? []) {
      const key = dayKey(m.scheduledAt);
      const found = out.find((b) => b.day === key);
      if (found) found.matches.push(m);
      else out.push({ day: key, matches: [m] });
    }
    return out;
  })();

  // Sticky region pinned below the orange app bar — keeps the round
  // selector in view while the user scrolls through the fixture list.
  const sticky = (
    <div className="px-4 pt-3 pb-3 bg-surface-alt border-b">
      <div className="rounded-xl bg-surface px-3 py-2.5 flex items-center justify-between border">
        <button
          type="button"
          onClick={() => canPrev && setRoundId(orderedRounds[idx - 1].id)}
          disabled={!canPrev}
          className="p-1 text-muted disabled:opacity-30 transition-transform active:scale-90"
          aria-label="Ronda anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-sm font-bold text-ink truncate px-2">
          {fixture.data?.round?.name ?? '—'}
        </div>
        <button
          type="button"
          onClick={() => canNext && setRoundId(orderedRounds[idx + 1].id)}
          disabled={!canNext}
          className="p-1 text-brand-orange disabled:opacity-30 transition-transform active:scale-90"
          aria-label="Ronda siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );

  return (
    <Layout title="Fixture" stickyContent={sticky}>
      <div className="px-4 pb-6 pt-3 space-y-4">
        {fixture.isLoading ? (
          <Card>
            <div className="px-4 py-8 text-center text-sm text-muted">Cargando…</div>
          </Card>
        ) : buckets.length === 0 ? (
          <Card>
            <div className="px-4 py-8 text-center text-sm text-muted">
              Esta ronda no tiene partidos cargados.
            </div>
          </Card>
        ) : (
          buckets.map((bucket) => (
            <DayCard key={bucket.day} matches={bucket.matches} onOpenMatch={setOpenMatch} />
          ))
        )}
      </div>

      <MatchPredictionsModal
        open={openMatch !== null}
        onClose={() => setOpenMatch(null)}
        matchId={openMatch?.id ?? null}
        title={openMatch ? matchModalTitle(openMatch) : ''}
      />
    </Layout>
  );
}

// Builds the predictions-modal title for a match: the real score once it has
// finished, otherwise the "COD vs COD" matchup (used while only locked).
function matchModalTitle(match: MatchWithPrediction): string {
  const finished =
    match.status === 'finished' && match.homeGoals !== null && match.awayGoals !== null;
  return finished
    ? `${match.homeTeam.code} ${match.homeGoals} - ${match.awayGoals} ${match.awayTeam.code}`
    : `${match.homeTeam.code} vs ${match.awayTeam.code}`;
}

function DayCard({
  matches,
  onOpenMatch,
}: {
  matches: MatchWithPrediction[];
  onOpenMatch: (match: MatchWithPrediction) => void;
}) {
  return (
    <Card>
      <div className="px-4 py-2.5 text-xs font-extrabold text-brand-navy bg-surface-alt">
        {formatDayHeader(matches[0].scheduledAt)}
      </div>
      {matches.map((m, i) => (
        <FixtureRow key={m.id} match={m} isFirst={i === 0} onOpenMatch={onOpenMatch} />
      ))}
    </Card>
  );
}

function FixtureRow({
  match,
  isFirst,
  onOpenMatch,
}: {
  match: MatchWithPrediction;
  isFirst: boolean;
  onOpenMatch: (match: MatchWithPrediction) => void;
}) {
  // Centre pill: kickoff time normally, real score when finished.
  const showScore =
    match.status === 'finished' && match.homeGoals !== null && match.awayGoals !== null;
  // Predictions become visible once the match locks (15 min before kickoff),
  // so the whole row turns clickable from that point — not only when finished.
  const isRevealed = match.isLocked || showScore;

  // Inner layout shared by the clickable and non-clickable variants. The
  // pill shows the real score (finished) or the kickoff time (pending).
  const content = (
    <>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xl leading-none">{match.homeTeam.flagEmoji}</span>
        <span className="text-sm font-semibold truncate text-ink">{match.homeTeam.nameEs}</span>
      </div>
      <div
        className={`px-3 py-1 rounded-md text-xs font-extrabold mx-3 border text-ink bg-surface-alt ${
          isRevealed ? 'border-brand-orange/40' : ''
        }`}
      >
        {showScore ? `${match.homeGoals} - ${match.awayGoals}` : formatTime(match.scheduledAt)}
      </div>
      <div className="flex items-center gap-2 justify-end min-w-0">
        <span className="text-sm font-semibold truncate text-ink">{match.awayTeam.nameEs}</span>
        <span className="text-xl leading-none">{match.awayTeam.flagEmoji}</span>
      </div>
    </>
  );

  const gridCols = { gridTemplateColumns: '1fr auto 1fr' } as const;

  // Once revealed (locked or finished), the whole row is clickable and opens
  // the per-match predictions of every participant. A subtle hover/active
  // background plus the faint orange outline on the score pill hint at the
  // affordance. Matches that are still open for editing stay static.
  if (isRevealed) {
    return (
      <button
        type="button"
        onClick={() => onOpenMatch(match)}
        className={`w-full grid items-center px-4 py-3 text-left transition-colors hover:bg-surface-alt active:bg-surface-alt ${
          isFirst ? '' : 'border-t'
        }`}
        style={gridCols}
        aria-label={`Ver predicciones de ${match.homeTeam.nameEs} vs ${match.awayTeam.nameEs}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`grid items-center px-4 py-3 ${isFirst ? '' : 'border-t'}`}
      style={gridCols}
    >
      {content}
    </div>
  );
}
