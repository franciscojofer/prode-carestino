// File: frontend/src/screens/AdminResultadosScreen.tsx
// Purpose: Admin screen for entering / editing match results.
// Functionality: Round selector at the top (chevrons), then one card per
// match. Each card has goal inputs, a status pill (FINALIZADO / PROGRAMADO),
// and a Guardar button that fires the PUT /admin/matches/:id/result.
// The score entered is the one at minute 120 — penalties are not part of
// scoring (rule 4 — updated), so no penalty picker is shown.
// Role: Bound to /admin/resultados behind AdminRoute.

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '../components/Header';
import { TabBar } from '../components/TabBar';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { AdminTabs } from '../components/AdminTabs';
import { useRounds, useCurrentRound } from '../hooks/useTournament';
import {
  useAdminMatches,
  useAdminTeams,
  useDeleteMatchResult,
  usePatchMatch,
  useSetMatchResult,
  type AdminMatchRow,
  type AdminTeamRow,
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
    <div className="flex flex-col h-dvh overflow-hidden bg-surface-alt">
      <Header title="Panel Admin" showBack onBack={() => navigate('/mas')} adminBadge />

      <AdminTabs active="results" />

      <div className="px-4 pt-2 pb-2 shrink-0">
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

      <main className="flex-1 overflow-y-auto overscroll-y-contain px-4 pb-4 space-y-3 pt-1">
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
  const [error, setError] = useState<string | null>(null);
  const setResult = useSetMatchResult();
  const deleteResult = useDeleteMatchResult();

  // When the cached row updates after a save, refresh the locally edited
  // values unless we're still mid-mutation.
  useEffect(() => {
    if (setResult.isPending) return;
    setHome(match.homeGoals !== null ? String(match.homeGoals) : '');
    setAway(match.awayGoals !== null ? String(match.awayGoals) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.homeGoals, match.awayGoals]);

  const sanitize = (v: string) => v.replace(/\D/g, '').slice(0, 2);
  const isFinished = match.status === 'finished';
  const homeFilled = home !== '';
  const awayFilled = away !== '';
  const bothFilled = homeFilled && awayFilled;
  const canSave = bothFilled;

  async function handleSave() {
    if (!canSave) return;
    setError(null);
    try {
      await setResult.mutateAsync({
        matchId: match.id,
        homeGoals: Number(home),
        awayGoals: Number(away),
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos guardar el resultado.');
    }
  }

  // Wipes the stored score when the admin cleared both inputs on a match
  // that was previously marked finished — typically because the result was
  // loaded by mistake or for a match that never happened.
  async function handleDelete() {
    if (
      !confirm(
        '¿Eliminar el resultado de este partido? Las predicciones quedarán en 0 puntos hasta que cargues uno nuevo.',
      )
    )
      return;
    setError(null);
    try {
      await deleteResult.mutateAsync(match.id);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos eliminar el resultado.');
    }
  }

  // A match is "pending team assignment" when it was created with the TBD
  // placeholder (rounds of 32, R16, etc., before the previous round resolves).
  const isPlayoffPending =
    match.placeholderLabel !== null &&
    (match.homeTeam.code === 'TBD' || match.awayTeam.code === 'TBD');

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between text-[10px] font-bold tracking-wider mb-2">
        <span className="text-muted">
          {formatShortDate(match.scheduledAt)} · {formatTime(match.scheduledAt)}
          {match.placeholderLabel ? ` · ${match.placeholderLabel}` : ''}
        </span>
        <StatusPill status={match.status} />
      </div>

      {isPlayoffPending && <PlayoffPicker match={match} />}

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

      {/* Wipe button: visible when the match has a stored result but the
          admin cleared the inputs. Lets them undo a wrongly-loaded score
          (or a result for a match that didn't happen). */}
      {isFinished && !bothFilled && (
        <div className="mt-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteResult.isPending}
            className="w-full rounded-lg border border-danger px-3 py-2 text-xs font-bold tracking-wider text-danger disabled:opacity-50"
          >
            {deleteResult.isPending ? 'ELIMINANDO…' : 'ELIMINAR RESULTADO'}
          </button>
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

// ---------------------------------------------------------------------------
// Playoff picker: shown for knockout matches whose pairings haven't been
// resolved yet (both teams still pointing at the TBD placeholder). The admin
// picks the real home / away teams once the previous round closes; the same
// component re-uses already-set values so it doubles as a "change teams"
// flow until the match is played.
// ---------------------------------------------------------------------------

type PlayoffPickerProps = { match: AdminMatchRow };
function PlayoffPicker({ match }: PlayoffPickerProps) {
  const teams = useAdminTeams();
  const patch = usePatchMatch();
  const [error, setError] = useState<string | null>(null);

  // Initial values: only pre-fill when the side is already assigned (not
  // TBD). That way the user has to make an explicit choice for slots that
  // haven't been resolved yet.
  const initialHome = match.homeTeam.code === 'TBD' ? '' : String(match.homeTeam.id);
  const initialAway = match.awayTeam.code === 'TBD' ? '' : String(match.awayTeam.id);
  const [homeId, setHomeId] = useState<string>(initialHome);
  const [awayId, setAwayId] = useState<string>(initialAway);

  // Group teams by group letter for an `<optgroup>` layout (48 unsorted
  // options is unusable on mobile).
  const grouped = (teams.data ?? [])
    .filter((t) => t.code !== 'TBD')
    .reduce<Record<string, AdminTeamRow[]>>((acc, t) => {
      const key = t.group?.name ?? '—';
      (acc[key] ??= []).push(t);
      return acc;
    }, {});
  const groupKeys = Object.keys(grouped).sort();

  const canSave =
    homeId !== '' &&
    awayId !== '' &&
    homeId !== awayId &&
    (homeId !== initialHome || awayId !== initialAway);

  async function handleSave() {
    if (!canSave) return;
    setError(null);
    try {
      await patch.mutateAsync({
        matchId: match.id,
        homeTeamId: Number(homeId),
        awayTeamId: Number(awayId),
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No pudimos asignar los equipos.');
    }
  }

  return (
    <div className="mb-3 p-2 rounded-lg bg-surface-alt border">
      <div className="text-[10px] font-bold tracking-wider text-brand-navy mb-1.5">
        ASIGNAR EQUIPOS
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TeamSelect
          value={homeId}
          onChange={setHomeId}
          groups={groupKeys}
          teamsByGroup={grouped}
          ariaLabel="Equipo local"
          placeholder="Local"
        />
        <TeamSelect
          value={awayId}
          onChange={setAwayId}
          groups={groupKeys}
          teamsByGroup={grouped}
          ariaLabel="Equipo visitante"
          placeholder="Visitante"
        />
      </div>
      {homeId !== '' && homeId === awayId && (
        <div className="mt-2 text-[11px] font-semibold text-danger">
          Local y visitante no pueden ser el mismo equipo.
        </div>
      )}
      {error && (
        <div className="mt-2 text-[11px] font-semibold text-danger">{error}</div>
      )}
      <div className="mt-2">
        <Button
          size="sm"
          fullWidth
          disabled={!canSave || patch.isPending}
          onClick={handleSave}
        >
          {patch.isPending ? 'GUARDANDO…' : 'GUARDAR EQUIPOS'}
        </Button>
      </div>
    </div>
  );
}

type TeamSelectProps = {
  value: string;
  onChange: (v: string) => void;
  groups: string[];
  teamsByGroup: Record<string, AdminTeamRow[]>;
  ariaLabel: string;
  placeholder: string;
};
function TeamSelect({
  value,
  onChange,
  groups,
  teamsByGroup,
  ariaLabel,
  placeholder,
}: TeamSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="w-full rounded-md border bg-surface px-2 py-1.5 text-xs font-semibold text-ink"
    >
      <option value="">{placeholder}…</option>
      {groups.map((g) => (
        <optgroup key={g} label={`Grupo ${g}`}>
          {teamsByGroup[g].map((t) => (
            <option key={t.id} value={t.id}>
              {t.flagEmoji} {t.nameEs}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

