// File: frontend/src/screens/TorneoScreen.tsx
// Purpose: Leaderboard screen — the home tab.
// Functionality: Renders a "Tu posición" card at the top with the current
// user's rank and points (if they accrue any), followed by the global
// standings table with shared ranks. The current user's row is highlighted
// using the orange-soft background from the mockup.
// Role: Bound to /torneo behind ProtectedRoute.

import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { useAuth } from '../hooks/useAuth';
import { useStandings, type StandingsRow } from '../hooks/useTournament';

// Returns the up-to-two-letter initials used in the avatar circle.
// Example: "Martín García" → "MG", "Lucía" → "L".
function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function TorneoScreen() {
  const { user } = useAuth();
  const standings = useStandings();

  return (
    <Layout title="Torneo">
      {/* "Tu posición" card. Anchors visually above the table by overlapping
          the orange header with a negative margin. */}
      <div className="px-4 -mt-3 mb-3">
        <UserPositionCard
          fullName={user ? `${user.nombre} ${user.apellido}` : ''}
          standings={standings.data ?? []}
          currentUserId={user?.id ?? null}
          isAdmin={user?.isAdmin ?? false}
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
          <StandingsTable rows={standings.data ?? []} currentUserId={user?.id ?? null} />
        )}
      </div>
    </Layout>
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
