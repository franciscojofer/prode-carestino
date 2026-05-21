// File: backend/prisma/seed.ts
// Purpose: Production seed for the Mundial 2026 prediction app.
// Functionality: Loads the admin user, the nine tournament rounds, the
// twelve groups, the forty-eight teams (placeholders by default) and the
// seventy-two group-stage matches. Knockout matches are NOT created here;
// pairings depend on group results and are added later via the admin
// panel (POST /api/admin/matches).
// Role: Run once with `npm run seed`. Safe to re-run — admin and tournament
// data are upserted; matches are skipped if any already exist.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================================
// EDITABLE CONSTANTS — review these before running in production.
// ============================================================================

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'SSGG_admin_2410';

// Tournament rounds in chronological order. Dates follow the FIFA Mundial 2026
// calendar (opening match 2026-06-11, final 2026-07-19).
// Times are stored in UTC; the frontend converts to Argentina time (UTC-3).
//
// TODO: confirm exact `startsAt`/`endsAt` against the published FIFA schedule
// before going live (the public calendar may shift by a few hours).
type RoundSeed = {
  name: string;
  orderIndex: number;
  startsAt: string;
  endsAt: string | null;
  isKnockout: boolean;
};

const ROUNDS: RoundSeed[] = [
  {
    name: 'Fase de Grupos - Fecha 1',
    orderIndex: 1,
    startsAt: '2026-06-11T19:00:00Z',
    endsAt: '2026-06-15T23:59:00Z',
    isKnockout: false,
  },
  {
    name: 'Fase de Grupos - Fecha 2',
    orderIndex: 2,
    startsAt: '2026-06-16T19:00:00Z',
    endsAt: '2026-06-22T23:59:00Z',
    isKnockout: false,
  },
  {
    name: 'Fase de Grupos - Fecha 3',
    orderIndex: 3,
    startsAt: '2026-06-23T19:00:00Z',
    endsAt: '2026-06-27T23:59:00Z',
    isKnockout: false,
  },
  {
    name: 'Dieciseisavos',
    orderIndex: 4,
    startsAt: '2026-06-28T19:00:00Z',
    endsAt: '2026-07-03T23:59:00Z',
    isKnockout: true,
  },
  {
    name: 'Octavos',
    orderIndex: 5,
    startsAt: '2026-07-04T19:00:00Z',
    endsAt: '2026-07-07T23:59:00Z',
    isKnockout: true,
  },
  {
    name: 'Cuartos',
    orderIndex: 6,
    startsAt: '2026-07-09T19:00:00Z',
    endsAt: '2026-07-11T23:59:00Z',
    isKnockout: true,
  },
  {
    name: 'Semifinal',
    orderIndex: 7,
    startsAt: '2026-07-14T19:00:00Z',
    endsAt: '2026-07-15T23:59:00Z',
    isKnockout: true,
  },
  {
    name: 'Tercer puesto',
    orderIndex: 8,
    startsAt: '2026-07-18T19:00:00Z',
    endsAt: '2026-07-18T23:59:00Z',
    isKnockout: true,
  },
  {
    name: 'Final',
    orderIndex: 9,
    startsAt: '2026-07-19T19:00:00Z',
    endsAt: '2026-07-19T23:59:00Z',
    isKnockout: true,
  },
];

// PLACEHOLDER teams. Replace with the official lineup from the FIFA draw
// (held on 2025-12-05). Each group has exactly four teams. Codes are
// 3-character unique slugs — swap them for the standard FIFA codes
// (ARG, BRA, JPN, …) when entering real data.
// Names must follow Argentine-Spanish spelling: "Catar" (not "Qatar"),
// "Marruecos" (not "Morocco"), "Países Bajos" (not "Holanda").
//
// TODO: REPLACE every entry below with the real teams of the corresponding
// group from the official draw.
type SeedTeam = { name: string; code: string; flag: string };
const TEAMS_BY_GROUP: Record<string, SeedTeam[]> = {
  A: [
    { name: 'Equipo A1', code: 'A1X', flag: '🏳️' },
    { name: 'Equipo A2', code: 'A2X', flag: '🏳️' },
    { name: 'Equipo A3', code: 'A3X', flag: '🏳️' },
    { name: 'Equipo A4', code: 'A4X', flag: '🏳️' },
  ],
  B: [
    { name: 'Equipo B1', code: 'B1X', flag: '🏳️' },
    { name: 'Equipo B2', code: 'B2X', flag: '🏳️' },
    { name: 'Equipo B3', code: 'B3X', flag: '🏳️' },
    { name: 'Equipo B4', code: 'B4X', flag: '🏳️' },
  ],
  C: [
    { name: 'Equipo C1', code: 'C1X', flag: '🏳️' },
    { name: 'Equipo C2', code: 'C2X', flag: '🏳️' },
    { name: 'Equipo C3', code: 'C3X', flag: '🏳️' },
    { name: 'Equipo C4', code: 'C4X', flag: '🏳️' },
  ],
  D: [
    { name: 'Equipo D1', code: 'D1X', flag: '🏳️' },
    { name: 'Equipo D2', code: 'D2X', flag: '🏳️' },
    { name: 'Equipo D3', code: 'D3X', flag: '🏳️' },
    { name: 'Equipo D4', code: 'D4X', flag: '🏳️' },
  ],
  E: [
    { name: 'Equipo E1', code: 'E1X', flag: '🏳️' },
    { name: 'Equipo E2', code: 'E2X', flag: '🏳️' },
    { name: 'Equipo E3', code: 'E3X', flag: '🏳️' },
    { name: 'Equipo E4', code: 'E4X', flag: '🏳️' },
  ],
  F: [
    { name: 'Equipo F1', code: 'F1X', flag: '🏳️' },
    { name: 'Equipo F2', code: 'F2X', flag: '🏳️' },
    { name: 'Equipo F3', code: 'F3X', flag: '🏳️' },
    { name: 'Equipo F4', code: 'F4X', flag: '🏳️' },
  ],
  G: [
    { name: 'Equipo G1', code: 'G1X', flag: '🏳️' },
    { name: 'Equipo G2', code: 'G2X', flag: '🏳️' },
    { name: 'Equipo G3', code: 'G3X', flag: '🏳️' },
    { name: 'Equipo G4', code: 'G4X', flag: '🏳️' },
  ],
  H: [
    { name: 'Equipo H1', code: 'H1X', flag: '🏳️' },
    { name: 'Equipo H2', code: 'H2X', flag: '🏳️' },
    { name: 'Equipo H3', code: 'H3X', flag: '🏳️' },
    { name: 'Equipo H4', code: 'H4X', flag: '🏳️' },
  ],
  I: [
    { name: 'Equipo I1', code: 'I1X', flag: '🏳️' },
    { name: 'Equipo I2', code: 'I2X', flag: '🏳️' },
    { name: 'Equipo I3', code: 'I3X', flag: '🏳️' },
    { name: 'Equipo I4', code: 'I4X', flag: '🏳️' },
  ],
  J: [
    { name: 'Equipo J1', code: 'J1X', flag: '🏳️' },
    { name: 'Equipo J2', code: 'J2X', flag: '🏳️' },
    { name: 'Equipo J3', code: 'J3X', flag: '🏳️' },
    { name: 'Equipo J4', code: 'J4X', flag: '🏳️' },
  ],
  K: [
    { name: 'Equipo K1', code: 'K1X', flag: '🏳️' },
    { name: 'Equipo K2', code: 'K2X', flag: '🏳️' },
    { name: 'Equipo K3', code: 'K3X', flag: '🏳️' },
    { name: 'Equipo K4', code: 'K4X', flag: '🏳️' },
  ],
  L: [
    { name: 'Equipo L1', code: 'L1X', flag: '🏳️' },
    { name: 'Equipo L2', code: 'L2X', flag: '🏳️' },
    { name: 'Equipo L3', code: 'L3X', flag: '🏳️' },
    { name: 'Equipo L4', code: 'L4X', flag: '🏳️' },
  ],
};

// ============================================================================
// HELPERS
// ============================================================================

// Ensures the admin account exists with the configured credentials.
// Idempotent — safe to call repeatedly.
async function seedAdmin(): Promise<void> {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, isAdmin: true, isActive: true },
    create: {
      nombre: 'Admin',
      apellido: 'Carestino',
      cuil: '00-00000000-0',
      email: ADMIN_EMAIL,
      passwordHash,
      isAdmin: true,
      isActive: true,
    },
  });
}

// Upserts the nine tournament rounds. Idempotent.
// Returns a map from orderIndex to round id for the match generator.
async function seedRounds(): Promise<Map<number, number>> {
  const byIndex = new Map<number, number>();
  for (const round of ROUNDS) {
    const row = await prisma.tournamentRound.upsert({
      where: { orderIndex: round.orderIndex },
      update: {
        name: round.name,
        startsAt: new Date(round.startsAt),
        endsAt: round.endsAt ? new Date(round.endsAt) : null,
        isKnockout: round.isKnockout,
      },
      create: {
        name: round.name,
        orderIndex: round.orderIndex,
        startsAt: new Date(round.startsAt),
        endsAt: round.endsAt ? new Date(round.endsAt) : null,
        isKnockout: round.isKnockout,
      },
    });
    byIndex.set(round.orderIndex, row.id);
  }
  return byIndex;
}

// Upserts the twelve groups and their teams. Idempotent.
// Returns a nested map: groupName → array of team rows in declared order.
type SeededTeam = { id: number; name: string; code: string };
async function seedGroupsAndTeams(): Promise<Map<string, SeededTeam[]>> {
  const result = new Map<string, SeededTeam[]>();
  for (const [groupName, teams] of Object.entries(TEAMS_BY_GROUP)) {
    const group = await prisma.group.upsert({
      where: { name: groupName },
      update: {},
      create: { name: groupName },
    });

    const seededTeams: SeededTeam[] = [];
    for (const team of teams) {
      const row = await prisma.team.upsert({
        where: { code: team.code },
        update: {
          nameEs: team.name,
          flagEmoji: team.flag,
          groupId: group.id,
        },
        create: {
          nameEs: team.name,
          code: team.code,
          flagEmoji: team.flag,
          groupId: group.id,
        },
      });
      seededTeams.push({ id: row.id, name: row.nameEs, code: row.code });
    }
    result.set(groupName, seededTeams);
  }
  return result;
}

// FIFA-style round-robin pairings for a four-team group.
// Pattern (where the numbers are the position within the group):
//   Matchday 1: 1v2, 3v4
//   Matchday 2: 1v3, 4v2
//   Matchday 3: 4v1, 2v3
// Returns an array of { home, away, matchday } triples.
function pairingsForGroup(teams: SeededTeam[]) {
  const [t1, t2, t3, t4] = teams;
  return [
    { home: t1, away: t2, matchday: 1 },
    { home: t3, away: t4, matchday: 1 },
    { home: t1, away: t3, matchday: 2 },
    { home: t4, away: t2, matchday: 2 },
    { home: t4, away: t1, matchday: 3 },
    { home: t2, away: t3, matchday: 3 },
  ];
}

// Builds a list of evenly-spaced kickoff timestamps inside a round window.
// Inputs: ISO date string for round start, total matches to schedule, and
// the round end date (used only to clamp the last slot).
// Output: array of `total` Date objects spaced 3 hours apart starting at
// roundStart. The admin is expected to overwrite these with the real FIFA
// kickoffs once they are published.
function buildKickoffSlots(roundStartIso: string, total: number): Date[] {
  const slots: Date[] = [];
  const base = new Date(roundStartIso).getTime();
  // 3-hour spacing keeps 24 group-stage matches inside a 3-day window —
  // good enough as a placeholder. Replace per-match once the official
  // fixture is published.
  const stepMs = 3 * 60 * 60 * 1000;
  for (let i = 0; i < total; i += 1) {
    slots.push(new Date(base + i * stepMs));
  }
  return slots;
}

// Creates the seventy-two group-stage matches. Skips itself when the
// database already contains any match — assumes the user manages
// modifications through the admin panel after the initial load.
async function seedGroupStageMatches(
  groups: Map<string, SeededTeam[]>,
  rounds: Map<number, number>,
): Promise<number> {
  const existingMatches = await prisma.match.count();
  if (existingMatches > 0) {
    return 0;
  }

  // Bucket pairings by matchday so we can schedule each round independently.
  const byMatchday: Record<1 | 2 | 3, Array<{ home: SeededTeam; away: SeededTeam; group: string }>> = {
    1: [],
    2: [],
    3: [],
  };
  for (const [groupName, teams] of groups.entries()) {
    for (const pair of pairingsForGroup(teams)) {
      byMatchday[pair.matchday as 1 | 2 | 3].push({
        home: pair.home,
        away: pair.away,
        group: groupName,
      });
    }
  }

  let created = 0;
  for (const matchday of [1, 2, 3] as const) {
    const roundId = rounds.get(matchday);
    if (!roundId) continue;
    const roundDef = ROUNDS.find((r) => r.orderIndex === matchday)!;
    const slots = buildKickoffSlots(roundDef.startsAt, byMatchday[matchday].length);

    for (let i = 0; i < byMatchday[matchday].length; i += 1) {
      const pair = byMatchday[matchday][i];
      await prisma.match.create({
        data: {
          roundId,
          countsForRoundId: roundId,
          homeTeamId: pair.home.id,
          awayTeamId: pair.away.id,
          scheduledAt: slots[i],
          isKnockout: false,
          status: 'scheduled',
        },
      });
      created += 1;
    }
  }
  return created;
}

// ============================================================================
// ENTRY POINT
// ============================================================================

async function main(): Promise<void> {
  await seedAdmin();
  const rounds = await seedRounds();
  const groups = await seedGroupsAndTeams();
  const matchesCreated = await seedGroupStageMatches(groups, rounds);

  /* eslint-disable no-console */
  console.log('Seed completo.');
  console.log(`  Admin: ${ADMIN_EMAIL}`);
  console.log(`  Rondas: ${ROUNDS.length}`);
  console.log(`  Grupos: ${Object.keys(TEAMS_BY_GROUP).length}`);
  console.log(`  Equipos: ${Object.values(TEAMS_BY_GROUP).flat().length}`);
  if (matchesCreated > 0) {
    console.log(`  Partidos de grupos creados: ${matchesCreated}`);
  } else {
    console.log('  Partidos: ya existen, no se modificaron.');
  }
  console.log('');
  console.log('TODO: cargar los nombres reales de los equipos del sorteo del 5/12/2025');
  console.log('      editando TEAMS_BY_GROUP en este archivo y reseteando la DB.');
  console.log('TODO: los partidos de eliminatorias se crean desde el panel admin');
  console.log('      con POST /api/admin/matches cuando se conozcan los cruces.');
  /* eslint-enable no-console */
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
