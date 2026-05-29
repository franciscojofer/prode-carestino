// File: frontend/src/screens/TorneoScreen.tsx
// Purpose: Leaderboard screen — the home tab.
// Functionality: Two top-level views switched with a SegmentedControl:
//   - Individual: "Tu posición" card + global table with unique ranks.
//   - Equipos:    by-team table with a sub-selector for "Por fecha"
//                 (chevron-navigated round) and "Total" (overall avg).
// Role: Bound to /torneo behind ProtectedRoute.

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { SegmentedControl } from '../components/SegmentedControl';
import { useAuth } from '../hooks/useAuth';
import {
  useStandings,
  useTeamStandings,
  type StandingsRow,
  type TeamStandingsRow,
} from '../hooks/useTournament';

// Returns the up-to-two-letter initials used in the avatar circle.
// Example: "Martín García" → "MG", "Lucía" → "L".
function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

// Top-level view selector.
type TopView = 'individual' | 'teams';
// Sub-view inside Equipos.
type TeamScope = 'round' | 'total';

export function TorneoScreen() {
  const { user } = useAuth();
  const [view, setView] = useState<TopView>('individual');

  return (
    <Layout title="Torneo">
      <div className="px-4 -mt-3 mb-3">
        <SegmentedControl
          value={view}
          onChange={(v) => setView(v as TopView)}
          options={[
            { value: 'individual', label: 'INDIVIDUAL' },
            { value: 'teams', label: 'EQUIPOS' },
          ]}
        />
      </div>

      {view === 'individual' ? (
        <IndividualView userId={user?.id ?? null} userName={user ? `${user.nombre} ${user.apellido}` : ''} isAdmin={user?.isAdmin ?? false} />
      ) : (
        <TeamsView />
      )}
    </Layout>
  );
}

// ---------------------------------------------------------------------------
// Individual view (original behaviour)
// ---------------------------------------------------------------------------

type IndividualViewProps = {
  userId: number | null;
  userName: string;
  isAdmin: boolean;
};

function IndividualView({ userId, userName, isAdmin }: IndividualViewProps) {
  const standings = useStandings();

  return (
    <>
      <div className="px-4 mb-3">
        <UserPositionCard
          fullName={userName}
          standings={standings.data ?? []}
          currentUserId={userId}
          isAdmin={isAdmin}
        />
      </div>

      <div className="px-4 mb-2 flex items-center justify-between">
        <h2 className="text-xs font-extrabold tracking-[0.18em] text-brand-navy">
          TABLA GENERAL
        </h2>
        <span className="text-[11px] font-semibold text-muted">
          {standings.data?.length ?? 0} participantes
        </span>
      </div>

      <div className="px-4 pb-6">
        {standings.isLoading ? (
          <Card>
            <div className="px-4 py-8 text-center text-sm text-muted">Cargando…</div>
          </Card>
        ) : standings.isError ? (
          <Card>
            <div className="px-4 py-8 text-center text-sm text-danger">
              No pudimos cargar la tabla. Reintentá en un momento.
            </div>
          </Card>
        ) : (
          <StandingsTable rows={standings.data ?? []} currentUserId={userId} />
        )}
      </div>
    </>
  );
}

type UserPositionCardProps = {
  fullName: string;
  standings: StandingsRow[];
  currentUserId: number | null;
  isAdmin: boolean;
};

function UserPositionCard({
  fullName,
  standings,
  currentUserId,
  isAdmin,
}: UserPositionCardProps) {
  // Admins are excluded from the leaderboard on the backend, so the card
  // would always show 0 / "—". Show the bare profile chip instead.
  const myRow = currentUserId === null ? null : standings.find((r) => r.userId === currentUserId);

  return (
    <Card className="px-4 py-3 flex items-center gap-3 shadow-sm">
      <div className="rounded-full w-10 h-10 flex items-center justify-center font-bold bg-brand-orange-soft text-brand-orange">
        {getInitials(fullName) || '—'}
      </div>
      <div className="flex-1 min-w-0">
        {isAdmin ? (
          <>
            <div className="text-xs font-semibold text-muted">Sesión activa</div>
            <div className="text-sm font-bold text-ink truncate">{fullName}</div>
          </>
        ) : myRow ? (
          <>
            <div className="text-xs font-semibold text-muted">Tu posición</div>
            <div className="text-sm font-bold text-ink truncate">
              {myRow.position}° · {fullName}
            </div>
          </>
        ) : (
          <>
            <div className="text-xs font-semibold text-muted">Tu posición</div>
            <div className="text-sm font-bold text-ink truncate">Sin partidos jugados</div>
          </>
        )}
      </div>
      {!isAdmin && (
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted">
            Puntos
          </div>
          <div className="text-xl font-extrabold text-brand-orange">
            {myRow?.totalPoints ?? 0}
          </div>
        </div>
      )}
    </Card>
  );
}

type StandingsTableProps = {
  rows: StandingsRow[];
  currentUserId: number | null;
};

function StandingsTable({ rows, currentUserId }: StandingsTableProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <div className="px-4 py-8 text-center text-sm text-muted">
          Todavía no hay participantes con puntos.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="grid grid-cols-12 px-3 py-2.5 text-[10px] font-bold tracking-wider text-muted bg-surface-alt">
        <div className="col-span-1">#</div>
        <div className="col-span-7">PARTICIPANTE</div>
        <div className="col-span-2 text-right">EX.</div>
        <div className="col-span-2 text-right">PTS</div>
      </div>
      {rows.map((row, i) => {
        const isMe = row.userId === currentUserId;
        return (
          <div
            key={row.userId}
            className={`grid grid-cols-12 px-3 py-3 text-sm items-center ${
              isMe ? 'bg-brand-orange-soft text-brand-orange font-bold' : 'text-ink font-medium'
            } ${i === 0 ? '' : 'border-t'}`}
          >
            <div className="col-span-1 font-bold">{row.position}</div>
            <div className="col-span-7 truncate">{row.name}</div>
            <div className="col-span-2 text-right">{row.exactCount}</div>
            <div className="col-span-2 text-right font-extrabold">{row.totalPoints}</div>
          </div>
        );
      })}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Teams view (rule 9 — team prizes)
// ---------------------------------------------------------------------------

function TeamsView() {
  const teams = useTeamStandings();
  const [scope, setScope] = useState<TeamScope>('round');
  // Selected roundId for the "Por fecha" sub-view. Defaults to the first
  // round that has any non-zero points; falls back to the first round.
  const [roundId, setRoundId] = useState<number | null>(null);

  // Pick a sensible default round once data arrives.
  useEffect(() => {
    if (roundId !== null || !teams.data) return;
    // Latest round with any points awarded — usually the one being played.
    const byRound = teams.data.byRound;
    const latestWithPoints = [...byRound]
      .reverse()
      .find((r) => r.teams.some((t) => t.totalPoints > 0));
    setRoundId((latestWithPoints ?? byRound[0])?.roundId ?? null);
  }, [teams.data, roundId]);

  if (teams.isLoading) {
    return (
      <div className="px-4 pb-6">
        <Card>
          <div className="px-4 py-8 text-center text-sm text-muted">Cargando…</div>
        </Card>
      </div>
    );
  }

  if (teams.isError || !teams.data) {
    return (
      <div className="px-4 pb-6">
        <Card>
          <div className="px-4 py-8 text-center text-sm text-danger">
            No pudimos cargar la tabla por equipos. Reintentá en un momento.
          </div>
        </Card>
      </div>
    );
  }

  const ordered = teams.data.byRound;
  const idx = ordered.findIndex((r) => r.roundId === roundId);
  const canPrev = idx > 0;
  const canNext = idx >= 0 && idx < ordered.length - 1;
  const selectedRound = idx >= 0 ? ordered[idx] : null;

  return (
    <div className="px-4 pb-6">
      <div className="mb-3">
        <SegmentedControl
          value={scope}
          onChange={(v) => setScope(v as TeamScope)}
          options={[
            { value: 'round', label: 'POR FECHA' },
            { value: 'total', label: 'TOTAL' },
          ]}
        />
      </div>

      {scope === 'round' ? (
        <>
          <div className="mb-3 rounded-xl bg-surface px-3 py-2.5 flex items-center justify-between border">
            <button
              type="button"
              onClick={() => canPrev && setRoundId(ordered[idx - 1].roundId)}
              disabled={!canPrev}
              className="p-1 text-muted disabled:opacity-30"
              aria-label="Fecha anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-sm font-bold text-ink truncate px-2">
              {selectedRound?.roundName ?? '—'}
            </div>
            <button
              type="button"
              onClick={() => canNext && setRoundId(ordered[idx + 1].roundId)}
              disabled={!canNext}
              className="p-1 text-brand-orange disabled:opacity-30"
              aria-label="Fecha siguiente"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <TeamStandingsTable rows={selectedRound?.teams ?? []} />
        </>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-extrabold tracking-[0.18em] text-brand-navy">
              CAMPEÓN POR EQUIPO
            </h2>
            <span className="text-[11px] font-semibold text-muted">
              {teams.data.total.length} equipos
            </span>
          </div>
          <TeamStandingsTable rows={teams.data.total} />
        </>
      )}
    </div>
  );
}

type TeamStandingsTableProps = { rows: TeamStandingsRow[] };

function TeamStandingsTable({ rows }: TeamStandingsTableProps) {
  if (rows.length === 0) {
    return (
      <Card>
        <div className="px-4 py-8 text-center text-sm text-muted">
          Todavía no hay equipos con puntos.
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="grid grid-cols-12 px-3 py-2.5 text-[10px] font-bold tracking-wider text-muted bg-surface-alt">
        <div className="col-span-1">#</div>
        <div className="col-span-5">EQUIPO</div>
        <div className="col-span-2 text-right">INT.</div>
        <div className="col-span-2 text-right">PTS</div>
        <div className="col-span-2 text-right">PROM.</div>
      </div>
      {rows.map((row, i) => (
        <div
          key={row.equipo}
          className={`grid grid-cols-12 px-3 py-3 text-sm items-center text-ink font-medium ${
            i === 0 ? '' : 'border-t'
          }`}
        >
          <div className="col-span-1 font-bold">{row.position}</div>
          <div className="col-span-5 uppercase truncate">{row.equipo}</div>
          <div className="col-span-2 text-right">{row.members}</div>
          <div className="col-span-2 text-right">{row.totalPoints}</div>
          <div className="col-span-2 text-right font-extrabold text-brand-orange">
            {row.averagePoints.toFixed(1)}
          </div>
        </div>
      ))}
    </Card>
  );
}
