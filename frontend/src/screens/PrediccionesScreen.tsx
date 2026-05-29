// File: frontend/src/screens/PrediccionesScreen.tsx
// Purpose: Predictions tab — lets the user load and edit forecasts.
// Functionality: Defaults to the round currently open for editing, lets
// the user navigate between rounds with chevrons, shows a progress
// indicator (X/Y predictions filled) and renders one PredictionCard per
// match. Each card auto-saves on blur when both score fields are filled.
// Draws are accepted in every match (knockouts included) per rule 4.
// Role: Bound to /predicciones behind ProtectedRoute.

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import {
  usePredictionsByRound,
  useSetPrediction,
  useCurrentPredictions,
  type MatchWithPrediction,
} from '../hooks/usePredictions';
import { useRounds } from '../hooks/useTournament';
import { formatShortDate, formatTime } from '../lib/dateFormat';
import { ApiError } from '../lib/apiClient';

export function PrediccionesScreen() {
  const current = useCurrentPredictions();
  const rounds = useRounds();
  // Selected round id. Starts null until /current resolves, then defaults
  // to the active round; the user can navigate with the chevrons.
  const [roundId, setRoundId] = useState<number | null>(null);

  useEffect(() => {
    if (roundId === null && current.data?.round) {
      setRoundId(current.data.round.id);
    }
  }, [current.data, roundId]);

  const predictions = usePredictionsByRound(roundId);
  const round = predictions.data?.round ?? null;
  const matches = predictions.data?.matches ?? [];

  // Find the index of the active round in the sorted list so the chevrons
  // can advance / step back.
  const orderedRounds = rounds.data ?? [];
  const currentIdx = orderedRounds.findIndex((r) => r.id === roundId);
  const canPrev = currentIdx > 0;
  const canNext = currentIdx >= 0 && currentIdx < orderedRounds.length - 1;

  const filled = matches.filter((m) => m.prediction !== null).length;

  // Sticky header region pinned below the orange app bar — keeps the
  // round selector and progress indicator visible while the user scrolls
  // through the prediction cards.
  const sticky = (
    <div className="px-4 pt-3 pb-3 bg-surface-alt border-b">
      <RoundSelector
        label={round ? round.name : '—'}
        onPrev={() => canPrev && setRoundId(orderedRounds[currentIdx - 1].id)}
        onNext={() => canNext && setRoundId(orderedRounds[currentIdx + 1].id)}
        canPrev={canPrev}
        canNext={canNext}
      />

      {matches.length > 0 && (
        <>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="font-bold tracking-wider text-brand-navy">
              PRONÓSTICOS CARGADOS
            </span>
            <span className="font-extrabold text-brand-orange">
              {filled}/{matches.length}
            </span>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-surface border">
            <div
              className="h-full rounded-full bg-brand-orange transition-all"
              style={{
                width: `${matches.length === 0 ? 0 : (filled / matches.length) * 100}%`,
              }}
            />
          </div>
        </>
      )}
    </div>
  );

  return (
    <Layout title="Predicciones" stickyContent={sticky}>
      <div className="px-4 pt-3 pb-6 space-y-3">
        {predictions.isLoading ? (
          <Card>
            <div className="px-4 py-8 text-center text-sm text-muted">Cargando…</div>
          </Card>
        ) : matches.length === 0 ? (
          <Card>
            <div className="px-4 py-8 text-center text-sm text-muted">
              No hay partidos cargados en esta ronda todavía.
            </div>
          </Card>
        ) : (
          matches.map((match, i) => (
            <PredictionCard key={match.id} match={match} index={i} />
          ))
        )}
      </div>
    </Layout>
  );
}

type RoundSelectorProps = {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  canPrev: boolean;
  canNext: boolean;
};

function RoundSelector({ label, onPrev, onNext, canPrev, canNext }: RoundSelectorProps) {
  return (
    <div className="rounded-xl bg-surface px-3 py-2.5 flex items-center justify-between border">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        className="p-1 text-muted disabled:opacity-30 transition-transform active:scale-90"
        aria-label="Ronda anterior"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="text-sm font-bold text-ink truncate px-2 transition-opacity">{label}</div>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="p-1 text-brand-orange disabled:opacity-30 transition-transform active:scale-90"
        aria-label="Ronda siguiente"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

type PredictionCardProps = { match: MatchWithPrediction; index: number };

// Cap on the stagger so a 24-card round still finishes within ~600 ms.
// First card has no delay; each subsequent card adds 40 ms until the cap.
const STAGGER_STEP_MS = 40;
const STAGGER_MAX_MS = 480;

function PredictionCard({ match, index }: PredictionCardProps) {
  // Local input state held as strings — Number() conversion happens just
  // before the network call so an empty box doesn't accidentally save as 0.
  const [home, setHome] = useState(
    match.prediction?.homeGoals !== undefined ? String(match.prediction!.homeGoals) : '',
  );
  const [away, setAway] = useState(
    match.prediction?.awayGoals !== undefined ? String(match.prediction!.awayGoals) : '',
  );
  const [error, setError] = useState<string | null>(null);
  const setPred = useSetPrediction();

  // When the server reflects a new value AND we're not in the middle of
  // typing, refresh the inputs. Avoids stale UI after a refetch.
  useEffect(() => {
    if (setPred.isPending) return;
    const serverHome =
      match.prediction?.homeGoals !== undefined ? String(match.prediction!.homeGoals) : '';
    const serverAway =
      match.prediction?.awayGoals !== undefined ? String(match.prediction!.awayGoals) : '';
    if (serverHome !== home) setHome(serverHome);
    if (serverAway !== away) setAway(serverAway);
    // Intentionally omit `home`/`away` from deps: we only resync on server
    // changes, not on every local keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.prediction?.homeGoals, match.prediction?.awayGoals]);

  // Accept only digits and cap at two characters so the inputs match the
  // mockup's 11×11 px chips.
  const sanitize = (v: string) => v.replace(/\D/g, '').slice(0, 2);

  function handleChange(side: 'home' | 'away', raw: string) {
    const v = sanitize(raw);
    if (side === 'home') setHome(v);
    else setAway(v);
    setError(null);
  }

  // On blur, persist when both inputs are full. The "lock" guard is also
  // handled by the backend — duplicate validation is intentional so the
  // user never hits an avoidable 400.
  function maybeSave() {
    if (match.isLocked) return;
    if (home === '' || away === '') return;
    // Skip the call when the pair already matches what's saved.
    if (
      match.prediction &&
      match.prediction.homeGoals === Number(home) &&
      match.prediction.awayGoals === Number(away)
    ) {
      return;
    }
    setError(null);
    setPred.mutate(
      { matchId: match.id, homeGoals: Number(home), awayGoals: Number(away) },
      {
        onError: (e) => {
          setError(e instanceof ApiError ? e.message : 'No pudimos guardar la predicción.');
        },
      },
    );
  }

  const showError = error !== null;
  const dimmed = match.isLocked || match.status === 'cancelled';
  const delay = Math.min(index * STAGGER_STEP_MS, STAGGER_MAX_MS);

  return (
    <div
      className={`rounded-2xl bg-surface p-3 border animate-stagger-in transition-all active:scale-[0.995] ${showError ? 'border-danger' : ''}`}
      style={{ opacity: dimmed ? 0.65 : 1, animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between text-[10px] font-bold tracking-wider mb-2 text-muted">
        <span>
          {formatShortDate(match.scheduledAt)} · {formatTime(match.scheduledAt)}
          {match.placeholderLabel ? ` · ${match.placeholderLabel}` : ''}
        </span>
        {match.isLocked && (
          <span className="flex items-center gap-1 text-danger">
            <Lock size={11} /> CERRADO
          </span>
        )}
      </div>
      <div className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr auto auto 1fr' }}>
        <TeamCell team={match.homeTeam} align="left" />
        <ScoreInput
          value={home}
          locked={match.isLocked}
          filled={home !== ''}
          onChange={(v) => handleChange('home', v)}
          onBlur={maybeSave}
          aria-label={`Goles ${match.homeTeam.nameEs}`}
        />
        <ScoreInput
          value={away}
          locked={match.isLocked}
          filled={away !== ''}
          onChange={(v) => handleChange('away', v)}
          onBlur={maybeSave}
          aria-label={`Goles ${match.awayTeam.nameEs}`}
        />
        <TeamCell team={match.awayTeam} align="right" />
      </div>
      {showError && (
        <div className="mt-2 text-[11px] font-semibold text-danger">{error}</div>
      )}
    </div>
  );
}

type TeamCellProps = { team: MatchWithPrediction['homeTeam']; align: 'left' | 'right' };

function TeamCell({ team, align }: TeamCellProps) {
  return (
    <div
      className={`flex items-center gap-2 min-w-0 ${align === 'right' ? 'justify-end' : ''}`}
    >
      {align === 'left' && <span className="text-2xl leading-none">{team.flagEmoji}</span>}
      <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
        <div className="text-sm font-bold text-ink truncate">{team.nameEs}</div>
        <div className="text-[10px] font-semibold tracking-wider text-muted">
          {team.code}
        </div>
      </div>
      {align === 'right' && <span className="text-2xl leading-none">{team.flagEmoji}</span>}
    </div>
  );
}

type ScoreInputProps = {
  value: string;
  locked: boolean;
  filled: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
  'aria-label': string;
};

function ScoreInput({ value, locked, filled, onChange, onBlur, ...rest }: ScoreInputProps) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      disabled={locked}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className="w-11 h-11 text-center text-lg font-extrabold rounded-lg outline-none bg-surface text-ink"
      style={{
        border: `1.5px dashed ${filled ? 'var(--brand-orange)' : 'var(--border)'}`,
      }}
      placeholder="–"
      {...rest}
    />
  );
}
