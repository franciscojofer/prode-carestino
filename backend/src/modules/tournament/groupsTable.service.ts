// File: backend/src/modules/tournament/groupsTable.service.ts
// Purpose: Compute the live standings table for every group stage group.
// Functionality: Reads finished group-stage matches, aggregates wins,
// draws, losses, goals for/against, goal difference and points per team.
// Role: Backs the `/api/tournament/groups` endpoint and is consumed by the
// frontend's groups screen.

import type { Prisma } from '../../lib/db';

// Per-team line in the group table.
export type GroupTeamRow = {
  teamId: number;
  name: string;
  code: string;
  flagEmoji: string;
  pj: number; // played
  g: number; // won
  e: number; // drawn
  p: number; // lost
  gf: number; // goals for
  ga: number; // goals against
  dg: number; // goal difference
  pts: number; // points
};

export type GroupTable = {
  id: number;
  name: string;
  teams: GroupTeamRow[];
};

// Builds the live table for every group.
// Inputs: prisma client. Output: groups in alphabetical order, each with
// teams sorted by FIFA-style tie-breakers (pts → goal diff → goals for →
// name). Side effects: read-only.
export async function getGroupsTable(prisma: Prisma): Promise<GroupTable[]> {
  const groups = await prisma.group.findMany({
    orderBy: { name: 'asc' },
    include: { teams: true },
  });

  // Pull all finished group-stage matches once, then bucket per group.
  // Filtering in JS keeps the SQL trivial and the dataset is tiny (48 teams,
  // 72 matches in the group stage).
  const matches = await prisma.match.findMany({
    where: {
      isKnockout: false,
      homeGoals: { not: null },
      awayGoals: { not: null },
      resolvedAdministratively: false,
    },
    select: {
      homeTeamId: true,
      awayTeamId: true,
      homeGoals: true,
      awayGoals: true,
    },
  });

  return groups.map((group) => {
    const teamIds = new Set(group.teams.map((t) => t.id));
    // Only count matches where BOTH teams belong to the same group.
    const groupMatches = matches.filter(
      (m) => teamIds.has(m.homeTeamId) && teamIds.has(m.awayTeamId),
    );

    const rows: GroupTeamRow[] = group.teams.map((team) => {
      let pj = 0;
      let g = 0;
      let e = 0;
      let p = 0;
      let gf = 0;
      let ga = 0;
      for (const m of groupMatches) {
        const isHome = m.homeTeamId === team.id;
        const isAway = m.awayTeamId === team.id;
        if (!isHome && !isAway) continue;
        const goalsFor = isHome ? m.homeGoals! : m.awayGoals!;
        const goalsAgainst = isHome ? m.awayGoals! : m.homeGoals!;
        pj += 1;
        gf += goalsFor;
        ga += goalsAgainst;
        if (goalsFor > goalsAgainst) g += 1;
        else if (goalsFor === goalsAgainst) e += 1;
        else p += 1;
      }
      return {
        teamId: team.id,
        name: team.nameEs,
        code: team.code,
        flagEmoji: team.flagEmoji,
        pj,
        g,
        e,
        p,
        gf,
        ga,
        dg: gf - ga,
        pts: g * 3 + e,
      };
    });

    // Standard tie-breakers: points, goal difference, goals scored, then
    // alphabetical name as a deterministic last resort.
    rows.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.dg !== a.dg) return b.dg - a.dg;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.name.localeCompare(b.name, 'es-AR');
    });

    return { id: group.id, name: group.name, teams: rows };
  });
}
