// File: frontend/src/screens/AdminResultadosScreen.tsx
// Purpose: Admin screen for entering / editing match results.
// Functionality: Round selector at the top (chevrons), then one card per
// match. Each card has goal inputs, a status pill (FINALIZADO / PROGRAMADO),
// and a Guardar button that fires the PUT /admin/matches/:id/result.
// For knockout matches tied at 120 min, an additional selector appears
// so the admin can mark the team that won on penalties.
// Role: Bound to /admin/resultados behind AdminRoute.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ClipboardList, Users } from 'lucide-react';
import { Header } from '../components/Header';
import { TabBar } from '../components/TabBar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { SegmentedControl } from '../components/SegmentedControl';
import { useRounds, useCurrentRound } from '../hooks/useTournament';
import {
  useAdminMatches,
  useSetMatchResult,
  type AdminMatchRow,
} from '../hooks/useAdmin';
import { formatShortDate, formatTime } from '../lib/dateFormat';
import { ApiError } from '../lib/apiClient';

export function AdminResultadosScreen() {
  const navigate = useNavigate();
  const rounds = useRounds();
  const currentRound = useCurrentRound();
  const [roundId, setRoundId] = useState<number | null>(null);

  useEffect(() => {
    if (roundId === null && currentRound.data) setRoundId(currentRound.data.id);
  }, [currentRound.data, roundId]);

  const matches = useAdminMatches(roundId);
  const ordered = rounds.data ?? [];
  const idx = ordered.findIndex((r) => r.id === roundId);
  const canPrev = idx > 0;
  const canNext = idx >= 0 && idx < ordered.length - 1;

  return (
    <div className="flex flex-col min-h-screen bg-surface-alt">
      <Header title="Panel Admin" showBack onBack={() => navigate('/mas')} adminBadge />

      <div className="px-4 pt-3 pb-2">
        <SegmentedControl
          value="results"
          onChange={(v) => v === 'users' && navigate('/admin/usuarios')}
          options={[
            {
              value: 'users',
              label: (
                <>
                  <Users size={14} className="inline mr-1.5 -mt-0.5" />
                  USUARIOS
                </>
              ),
            },
            {
              value: 'results',
              label: (
                <>
                  <ClipboardList size={14} className="inline mr-1.5 -mt-0.5" />
                  RESULTADOS
                </>
              ),
            },
          ]}
        />
      </div>

      <div className="px-4 pt-2 pb-2">
        <div className="rounded-xl bg-surface px-3 py-2.5 flex items-center justify-between border">
          <button
            type="button"
            onClick={() => canPrev && setRoundId(ordered[idx - 1].id)}
            disabled={!canPrev}
            className="p-1 text-muted disabled:opacity-30"
            aria-label="Ronda anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="text-sm font-bold text-ink truncate px-2">
            {ordered[idx]?.name ?? '—'}
          </div>
          <button
            type="button"
            onClick={() => canNext && setRoundId(ordered[idx + 1].id)}
            disabled={!canNext}
            className="p-1 text-brand-orange disabled:opacity-30"
            aria-label="Ronda siguiente"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 pb-4 space-y-3 pt-1">
        {matches.isLoading ? (
          <Card>
            <div className="px-4 py-8 text-center text-sm text-muted">Cargando…</div>
          </Card>
        ) : (matches.data?.length ?? 0) === 0 ? (
          <Card>
            <div className="px-4 py-8 text-center text-sm text-muted">
              Esta ronda no tiene partidos cargados.
            </div>
          </Card>
        ) : (
          matches.data!.map((m) => <ResultCard key={m.id} match={m} />)
        )}
      </main>

      <TabBar />
    </div>
  );
}

// ---------------------------------------------------------------------------
// One match card with result inputs
// ---------------------------------------------------------------------------

function ResultCard({ match }: { match: AdminMatchRow }) {
  // Local input state mirrors the saved score (or empty when missing).
  const [home, setHome] = useState(match.homeGoals !== null ? String(match.homeGoals) : '');
  const [away, setAway] = useState(match.awayGoals !== null ? String(match.awayGoals) : '');
  const [penaltyWinner, setPenaltyWinner] = useState<number | null>(
    match.winnerByPenaltiesTeamId,
  );
  const [error, setError] = useState<string | null>(null);
  const setResult = useSetMatchResult();

  // When the cached row updates after a save, refresh the locally edited
  // values unless we're still mid-mutation.
  useEffect(() => {
    if (setResult.isPending) return;
    setHome(match.homeGoals !== null ? String(match.homeGoals) : '');
    setAway(match.awayGoals !== null ? String(match.awayGoals) : '');
    setPenaltyWinner(match.winnerByPenaltiesTeamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.homeGoals, match.awayGoals, match.winnerByPenaltiesTeamId]);

  const sanitize = (v: string) => v.replace(/\D/g, '').slice(0, 2);
  const isFinished = match.status === 'finished';
  const homeFilled = home !== '';
  const awayFilled = away !== '';
  const bothFilled = homeFilled && awayFilled;
  const isKnockoutTie = match.isKnockout && bothFilled && Number(home) === Number(away);
  // Save button only enabled when the inputs make sense for the rules.
  const canSave =
    bothFilled && (!isKnockoutTie || penaltyWinner !== null);

  async function handleSave() {
    if (!canSave) return;
    setError(null);
    try {
      await setResult.mutateAsync({
        matchId: match.id,
        homeGoals: Number(home),
        awayGoals: Number(away),
        winnerByPenaltiesTeamId: isKnockoutTie ? penaltyWinner : null,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos guardar el resultado.');
    }
  }

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between text-[10px] font-bold tracking-wider mb-2">
        <span className="text-muted">
          {formatShortDate(match.scheduledAt)} · {formatTime(match.scheduledAt)}
          {match.placeholderLabel ? ` · ${match.placeholderLabel}` : ''}
        </span>
        <StatusPill status={match.status} />
      </div>
      <div
        className="grid items-center gap-2"
        style={{ gridTemplateColumns: '1fr auto auto 1fr' }}
      >
        <TeamCell team={match.homeTeam} align="left" />
        <GoalInput
          value={home}
          filled={homeFilled}
          onChange={(v) => setHome(sanitize(v))}
          aria-label={`Goles ${match.homeTeam.nameEs}`}
        />
        <GoalInput
          value={away}
          filled={awayFilled}
          onChange={(v) => setAway(sanitize(v))}
          aria-label={`Goles ${match.awayTeam.nameEs}`}
        />
        <TeamCell team={match.awayTeam} align="right" />
      </div>

      {isKnockoutTie && (
        <div className="mt-3 p-2 rounded-lg bg-surface-alt border">
          <div className="text-[10px] font-bold tracking-wider text-brand-navy mb-1.5">
            EMPATE EN 120 MIN · GANADOR POR PENALES
          </div>
          <div className="grid grid-cols-2 gap-2">
            <PenaltyChoice
              label={match.homeTeam.nameEs}
              flag={match.homeTeam.flagEmoji}
              checked={penaltyWinner === match.homeTeam.id}
              onSelect={() => setPenaltyWinner(match.homeTeam.id)}
            />
            <PenaltyChoice
              label={match.awayTeam.nameEs}
              flag={match.awayTeam.flagEmoji}
              checked={penaltyWinner === match.awayTeam.id}
              onSelect={() => setPenaltyWinner(match.awayTeam.id)}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 text-[11px] font-semibold text-danger">{error}</div>
      )}

      {bothFilled && (
        <div className="mt-3">
          <Button
            size="sm"
            fullWidth
            disabled={!canSave || setResult.isPending}
            onClick={handleSave}
          >
            {setResult.isPending
              ? 'GUARDANDO…'
              : isFinished
                ? 'ACTUALIZAR RESULTADO'
                : 'GUARDAR RESULTADO'}
          </Button>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: string }) {
  // Translate the backend's English status names to a short Spanish label
  // matching the mockup. Colours come from the design tokens.
  const map: Record<string, { label: string; cls: string }> = {
    finished: { label: 'FINALIZADO', cls: 'bg-success/15 text-success' },
    scheduled: { label: 'PROGRAMADO', cls: 'bg-surface-alt text-muted' },
    postponed: { label: 'POSTERGADO', cls: 'bg-surface-alt text-muted' },
    cancelled: { label: 'CANCELADO', cls: 'bg-danger/15 text-danger' },
  };
  const m = map[status] ?? map.scheduled;
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.cls}`}>{m.label}</span>;
}

type TeamCellProps = { team: AdminMatchRow['homeTeam']; align: 'left' | 'right' };
function TeamCell({ team, align }: TeamCellProps) {
  return (
    <div className={`flex items-center gap-2 min-w-0 ${align === 'right' ? 'justify-end' : ''}`}>
      {align === 'left' && <span className="text-xl leading-none">{team.flagEmoji}</span>}
      <span className={`text-sm font-bold truncate text-ink ${align === 'right' ? 'text-right' : ''}`}>
        {team.nameEs}
      </span>
      {align === 'right' && <span className="text-xl leading-none">{team.flagEmoji}</span>}
    </div>
  );
}

type GoalInputProps = {
  value: string;
  filled: boolean;
  onChange: (v: string) => void;
  'aria-label': string;
};
function GoalInput({ value, filled, onChange, ...rest }: GoalInputProps) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-11 h-11 text-center text-lg font-extrabold rounded-lg outline-none bg-surface text-ink"
      style={{
        border: `1.5px solid ${filled ? 'var(--brand-orange)' : 'var(--border)'}`,
      }}
      placeholder="–"
      {...rest}
    />
  );
}

type PenaltyChoiceProps = {
  label: string;
  flag: string;
  checked: boolean;
  onSelect: () => void;
};
function PenaltyChoice({ label, flag, checked, onSelect }: PenaltyChoiceProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-bold transition-colors border ${
        checked ? 'bg-brand-orange text-white border-brand-orange' : 'bg-surface text-ink'
      }`}
    >
      <span className="text-base leading-none">{flag}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

