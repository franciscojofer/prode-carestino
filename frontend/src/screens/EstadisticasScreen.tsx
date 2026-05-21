// File: frontend/src/screens/EstadisticasScreen.tsx
// Purpose: Group stage statistics screen.
// Functionality: Lists every group with its live table — games played,
// won, drawn, lost, goal difference and points — sorted by the standard
// tie-breakers handled by the backend.
// Role: Bound to /estadisticas behind ProtectedRoute.

import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { useGroups, type GroupTable, type GroupTeam } from '../hooks/useTournament';

export function EstadisticasScreen() {
  const groups = useGroups();

  return (
    <Layout title="Estadísticas">
      <div className="px-4 pt-3 pb-6 space-y-4">
        {groups.isLoading && (
          <Card>
            <div className="px-4 py-8 text-center text-sm text-muted">Cargando…</div>
          </Card>
        )}
        {groups.isError && (
          <Card>
            <div className="px-4 py-8 text-center text-sm text-danger">
              No pudimos cargar los grupos. Reintentá en un momento.
            </div>
          </Card>
        )}
        {groups.data?.map((group) => <GroupSection key={group.id} group={group} />)}
      </div>
    </Layout>
  );
}

function GroupSection({ group }: { group: GroupTable }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-extrabold tracking-wider text-brand-navy">
          GRUPO {group.name}
        </h3>
        <div className="flex-1 h-px border-t" />
      </div>
      <Card>
        <GroupHeaderRow />
        {group.teams.map((team, i) => (
          <GroupTeamRow key={team.teamId} team={team} index={i} />
        ))}
      </Card>
    </section>
  );
}

// Shared grid template for the group table header and body rows. Keeps
// the two layouts pixel-aligned without repeating the spec.
const GROUP_GRID = '1.2fr 4fr repeat(6, 1fr)';

function GroupHeaderRow() {
  return (
    <div
      className="grid px-3 py-2 text-[10px] font-bold tracking-wider text-muted bg-surface-alt"
      style={{ gridTemplateColumns: GROUP_GRID }}
    >
      <div>#</div>
      <div>EQUIPO</div>
      <div className="text-center">PJ</div>
      <div className="text-center">G</div>
      <div className="text-center">E</div>
      <div className="text-center">P</div>
      <div className="text-center">DG</div>
      <div className="text-right">PTS</div>
    </div>
  );
}

function GroupTeamRow({ team, index }: { team: GroupTeam; index: number }) {
  // Sign the goal difference so "+3" / "-2" / "0" always render explicitly.
  const dg = team.dg > 0 ? `+${team.dg}` : team.dg.toString();
  return (
    <div
      className={`grid px-3 py-2.5 text-xs items-center text-ink ${index === 0 ? '' : 'border-t'}`}
      style={{ gridTemplateColumns: GROUP_GRID }}
    >
      <div className="font-bold">{index + 1}</div>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base leading-none">{team.flagEmoji}</span>
        <span className="truncate font-semibold">{team.name}</span>
      </div>
      <div className="text-center">{team.pj}</div>
      <div className="text-center">{team.g}</div>
      <div className="text-center">{team.e}</div>
      <div className="text-center">{team.p}</div>
      <div className="text-center">{dg}</div>
      <div className="text-right font-extrabold text-brand-orange">{team.pts}</div>
    </div>
  );
}
