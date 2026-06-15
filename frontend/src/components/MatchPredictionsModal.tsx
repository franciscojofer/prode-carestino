// File: frontend/src/components/MatchPredictionsModal.tsx
// Purpose: Modal that lists every participant's prediction for a single
// finished match, opened by clicking the result of a Fixture row.
// Functionality: Renders a three-column table — participant, prediction
// and points — ordered by points DESC then name ASC (handled by the
// backend). The current user's row is highlighted.
// Role: Used by FixtureScreen.

import { Modal } from './Modal';
import { useMatchPredictions } from '../hooks/useTournament';
import { useAuth } from '../hooks/useAuth';

type Props = {
  open: boolean;
  onClose: () => void;
  matchId: number | null;
  // Pre-computed match label (e.g. "ARG 2 - 1 BRA") so the title shows
  // immediately without waiting for the request.
  title: string;
};

export function MatchPredictionsModal({ open, onClose, matchId, title }: Props) {
  const { user } = useAuth();
  const data = useMatchPredictions(open ? matchId : null);
  const rows = data.data?.rows ?? [];

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {data.isLoading ? (
        <div className="py-8 text-center text-sm text-muted">Cargando…</div>
      ) : data.isError ? (
        <div className="py-8 text-center text-sm text-danger">
          No pudimos cargar las predicciones. Reintentá en un momento.
        </div>
      ) : rows.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted">
          No hay participantes para mostrar.
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="grid grid-cols-12 px-3 py-2.5 text-[10px] font-bold tracking-wider text-muted bg-surface-alt">
            <div className="col-span-6">PARTICIPANTE</div>
            <div className="col-span-3 text-center">PRON.</div>
            <div className="col-span-3 text-right">PTS</div>
          </div>
          {rows.map((row, i) => {
            const isMe = row.userId === user?.id;
            return (
              <div
                key={row.userId}
                className={`grid grid-cols-12 px-3 py-2.5 text-sm items-center ${
                  isMe ? 'bg-brand-orange-soft text-brand-orange font-bold' : 'text-ink font-medium'
                } ${i === 0 ? '' : 'border-t'}`}
              >
                <div className="col-span-6 truncate">{row.name}</div>
                <div className="col-span-3 text-center tabular-nums">
                  {row.prediction
                    ? `${row.prediction.homeGoals} - ${row.prediction.awayGoals}`
                    : '—'}
                </div>
                <div
                  className={`col-span-3 text-right font-extrabold ${
                    row.isExact && !isMe ? 'text-brand-orange' : ''
                  }`}
                >
                  {row.points}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
