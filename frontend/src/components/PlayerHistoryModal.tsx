// File: frontend/src/components/PlayerHistoryModal.tsx
// Purpose: Modal that shows a single player's points history, opened by
// clicking a row in the leaderboard's general table.
// Functionality: Lets the user navigate between rounds with chevrons and
// renders, per match, the official result, the player's prediction (only
// once the match finished) and the points that prediction earned.
// Role: Used by TorneoScreen's individual leaderboard.

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Modal } from './Modal';
import {
  useRounds,
  useCurrentRound,
  useUserHistory,
  type UserHistoryMatch,
} from '../hooks/useTournament';
import { formatShortDate, formatTime } from '../lib/dateFormat';

type Props = {
  open: boolean;
  onClose: () => void;
  userId: number | null;
  userName: string;
};

export function PlayerHistoryModal({ open, onClose, userId, userName }: Props) {
  const rounds = useRounds();
  const currentRound = useCurrentRound();
  // Selected round id. Starts null until a sensible default is chosen.
  const [roundId, setRoundId] = useState<number | null>(null);

  const orderedRounds = rounds.data ?? [];

  // The round the modal should open on: the round currently being played,
  // falling back to the last round when there is no active one.
  const defaultRoundId =
    currentRound.data?.id ?? orderedRounds[orderedRounds.length - 1]?.id ?? null;

  // While the modal is open, anchor to the active round until the user
  // navigates away from it. The `open` guard keeps this from re-setting the
  // round while the modal is closed, which is what previously left the
  // field blank when reopening for another player.
  useEffect(() => {
    if (!open) return;
    if (roundId === null && defaultRoundId !== null) {
      setRoundId(defaultRoundId);
    }
  }, [open, roundId, defaultRoundId]);

  // Clear the selection when the modal closes so the next player always
  // starts on the round currently being played (requirement) instead of
  // wherever the previous navigation left off.
  useEffect(() => {
    if (!open) setRoundId(null);
  }, [open]);

  const history = useUserHistory(open ? userId : null, roundId);
  const matches = history.data?.matches ?? [];

  const idx = orderedRounds.findIndex((r) => r.id === roundId);
  const canPrev = idx > 0;
  const canNext = idx >= 0 && idx < orderedRounds.length - 1;
  const roundName = history.data?.round.name ?? orderedRounds[idx]?.name ?? '—';

  return (
    <Modal open={open} onClose={onClose} title={`Historial · ${userName}`}>
      <div className="rounded-xl bg-surface px-3 py-2.5 flex items-center justify-between border">
        <button
          type="button"
          onClick={() => canPrev && setRoundId(orderedRounds[idx - 1].id)}
          disabled={!canPrev}
          className="p-1 text-muted disabled:opacity-30 transition-transform active:scale-90"
          aria-label="Fecha anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-sm font-bold text-ink truncate px-2">{roundName}</div>
        <button
          type="button"
          onClick={() => canNext && setRoundId(orderedRounds[idx + 1].id)}
          disabled={!canNext}
          className="p-1 text-brand-orange disabled:opacity-30 transition-transform active:scale-90"
          aria-label="Fecha siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {history.isLoading ? (
          <div className="py-8 text-center text-sm text-muted">Cargando…</div>
        ) : history.isError ? (
          <div className="py-8 text-center text-sm text-danger">
            No pudimos cargar el historial. Reintentá en un momento.
          </div>
        ) : matches.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted">
            No hay partidos en esta fecha todavía.
          </div>
        ) : (
          matches.map((m) => <HistoryRow key={m.id} match={m} />)
        )}
      </div>
    </Modal>
  );
}

type HistoryRowProps = { match: UserHistoryMatch };

// Renders one match: official score on top, the player's prediction and
// points below. The prediction block only appears once the match finished.
function HistoryRow({ match }: HistoryRowProps) {
  const official = match.isFinished ? `${match.homeGoals} - ${match.awayGoals}` : 'vs';

  return (
    <div className="rounded-xl bg-surface border p-3">
      <div className="text-[10px] font-bold tracking-wider text-muted mb-2">
        {formatShortDate(match.scheduledAt)} · {formatTime(match.scheduledAt)}
      </div>

      <div
        className="grid items-center gap-2 text-sm"
        style={{ gridTemplateColumns: '1fr auto 1fr' }}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-lg leading-none">{match.homeTeam.flagEmoji}</span>
          <span className="font-bold text-ink truncate">{match.homeTeam.code}</span>
        </div>
        <span className="font-extrabold text-ink tabular-nums px-1">{official}</span>
        <div className="flex items-center gap-1.5 min-w-0 justify-end">
          <span className="font-bold text-ink truncate">{match.awayTeam.code}</span>
          <span className="text-lg leading-none">{match.awayTeam.flagEmoji}</span>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs">
        {!match.isFinished ? (
          <span className="flex items-center gap-1 text-muted">
            <Lock size={11} /> Pronóstico oculto hasta el final
          </span>
        ) : match.prediction ? (
          <>
            <span className="text-muted">
              Pronóstico:{' '}
              <span className="font-bold text-ink">
                {match.prediction.homeGoals} - {match.prediction.awayGoals}
              </span>
            </span>
            <span
              className={`font-extrabold ${
                match.points && match.points > 0 ? 'text-brand-orange' : 'text-muted'
              }`}
            >
              {match.points} {match.points === 1 ? 'pt' : 'pts'}
              {match.isExact ? ' · exacto' : ''}
            </span>
          </>
        ) : (
          <>
            <span className="text-muted italic">Sin pronóstico</span>
            <span className="font-extrabold text-muted">0 pts</span>
          </>
        )}
      </div>
    </div>
  );
}
