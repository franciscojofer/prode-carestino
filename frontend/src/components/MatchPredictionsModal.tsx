// File: frontend/src/components/MatchPredictionsModal.tsx
// Purpose: Modal that lists every participant's prediction for a single
// locked or finished match, opened by clicking a Fixture row.
// Functionality: Once a match is finished it renders a three-column table —
// participant, prediction and points — ordered by points DESC then name ASC.
// While only locked (result pending) it hides the points column and orders
// players by their current standings position (both handled by the backend).
// The current user's row is highlighted.
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
  // Points only exist once the match is scored; while it is merely locked the
  // table drops the PTS column and shows a "result pending" caption instead.
  const isFinished = data.data?.match.isFinished ?? false;

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
        <>
          {!isFinished && (
            <div className="mb-3 text-center text-xs font-semibold text-muted">
              Resultado pendiente · orden según la tabla general
            </div>
          )}
          <div className="rounded-xl border overflow-hidden">
            <div className="grid grid-cols-12 px-3 py-2.5 text-[10px] font-bold tracking-wider text-muted bg-surface-alt">
              <div className={isFinished ? 'col-span-6' : 'col-span-8'}>PARTICIPANTE</div>
              <div className={`${isFinished ? 'col-span-3' : 'col-span-4'} text-center`}>PRON.</div>
              {isFinished && <div className="col-span-3 text-right">PTS</div>}
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
                  <div className={`${isFinished ? 'col-span-6' : 'col-span-8'} truncate`}>
                    {row.name}
                  </div>
                  <div
                    className={`${isFinished ? 'col-span-3' : 'col-span-4'} text-center tabular-nums`}
                  >
                    {row.prediction
                      ? `${row.prediction.homeGoals} - ${row.prediction.awayGoals}`
                      : '—'}
                  </div>
                  {isFinished && (
                    <div
                      className={`col-span-3 text-right font-extrabold ${
                        row.isExact && !isMe ? 'text-brand-orange' : ''
                      }`}
                    >
                      {row.points}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </Modal>
  );
}
