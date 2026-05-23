// File: backend/prisma/seed.ts
// Purpose: Production seed for the Mundial 2026 prediction app.
// Functionality: Loads the admin user, the nine tournament rounds, the
// twelve groups, the forty-eight teams and the one-hundred-and-four
// matches from `docs/teams.csv` and `docs/matches.csv`. Knockout matches
// whose teams are not yet known use a single "Por definir" placeholder
// team and store the FIFA slot label (e.g. "1A vs 3CEFHI") so the admin
// can fill in the real teams once the group stage decides.
// When the CSV files are missing the script falls back to the old
// alphabetical placeholder fixture so development environments still work.
// Role: Run once with `npm run seed`. Safe to re-run — admin, rounds,
// groups and teams are upserted; matches are skipped if any already exist.

import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================================
// EDITABLE CONSTANTS
// ============================================================================

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'SSGG_admin_2410';

// FIFA Mundial 2026 calendar. Times are stored in UTC; the frontend
// converts to Argentina time (UTC-3).
type RoundSeed = {
  name: string;
  orderIndex: number;
  startsAt: string;
  endsAt: string | null;
  isKnockout: boolean;
};

const ROUNDS: RoundSeed[] = [
  { name: 'Fase de Grupos - Fecha 1', orderIndex: 1, startsAt: '2026-06-11T19:00:00Z', endsAt: '2026-06-17T23:59:00Z', isKnockout: false },
  { name: 'Fase de Grupos - Fecha 2', orderIndex: 2, startsAt: '2026-06-18T19:00:00Z', endsAt: '2026-06-23T23:59:00Z', isKnockout: false },
  { name: 'Fase de Grupos - Fecha 3', orderIndex: 3, startsAt: '2026-06-24T19:00:00Z', endsAt: '2026-06-27T23:59:00Z', isKnockout: false },
  { name: 'Dieciseisavos', orderIndex: 4, startsAt: '2026-06-28T19:00:00Z', endsAt: '2026-07-03T23:59:00Z', isKnockout: true },
  { name: 'Octavos', orderIndex: 5, startsAt: '2026-07-04T19:00:00Z', endsAt: '2026-07-07T23:59:00Z', isKnockout: true },
  { name: 'Cuartos', orderIndex: 6, startsAt: '2026-07-09T19:00:00Z', endsAt: '2026-07-11T23:59:00Z', isKnockout: true },
  { name: 'Semifinal', orderIndex: 7, startsAt: '2026-07-14T19:00:00Z', endsAt: '2026-07-15T23:59:00Z', isKnockout: true },
  { name: 'Tercer puesto', orderIndex: 8, startsAt: '2026-07-18T19:00:00Z', endsAt: '2026-07-18T23:59:00Z', isKnockout: true },
  { name: 'Final', orderIndex: 9, startsAt: '2026-07-19T19:00:00Z', endsAt: '2026-07-19T23:59:00Z', isKnockout: true },
];

// Maps FIFA stage_id (from matches.csv) to the orderIndex in ROUNDS.
// stage_id=1 (group stage) covers all three matchdays — split per
// match_number range below.
const STAGE_TO_ORDER: Record<number, number> = {
  2: 4, // R16 → Dieciseisavos
  3: 5, // R8  → Octavos
  4: 6, // QF  → Cuartos
  5: 7, // SF  → Semifinal
  6: 8, // 3rd → Tercer puesto
  7: 9, // F   → Final
};

// FIFA code → flag emoji. Covers every team that appears in teams.csv,
// including the six play-off winners decided in March 2026.
const FLAG_BY_CODE: Record<string, string> = {
  ARG: '🇦🇷', ALG: '🇩🇿', AUS: '🇦🇺', AUT: '🇦🇹', BEL: '🇧🇪',
  BIH: '🇧🇦', BRA: '🇧🇷', CAN: '🇨🇦', CIV: '🇨🇮', COD: '🇨🇩',
  COL: '🇨🇴', CPV: '🇨🇻', CRO: '🇭🇷', CUR: '🇨🇼', CZE: '🇨🇿',
  ECU: '🇪🇨', EGY: '🇪🇬', ENG: '🏴', ESP: '🇪🇸', FRA: '🇫🇷',
  GER: '🇩🇪', GHA: '🇬🇭', HAI: '🇭🇹', IRN: '🇮🇷', IRQ: '🇮🇶',
  JOR: '🇯🇴', JPN: '🇯🇵', KOR: '🇰🇷', KSA: '🇸🇦', MAR: '🇲🇦',
  MEX: '🇲🇽', NED: '🇳🇱', NOR: '🇳🇴', NZL: '🇳🇿', PAN: '🇵🇦',
  PAR: '🇵🇾', POR: '🇵🇹', QAT: '🇶🇦', RSA: '🇿🇦', SCO: '🏴',
  SEN: '🇸🇳', SUI: '🇨🇭', SWE: '🇸🇪', TUN: '🇹🇳', TUR: '🇹🇷',
  URU: '🇺🇾', USA: '🇺🇸', UZB: '🇺🇿',
};

// Special team used for knockout matches whose pairings aren't decided yet.
// Both home and away of every such match point at this row; the slot is
// disambiguated through `Match.placeholderLabel`.
const TBD_TEAM = { name: 'Por definir', code: 'TBD', flag: '🏳️' };

// File system paths to the CSV inputs. Resolved relative to the project
// root so the script works regardless of where node is invoked from.
const TEAMS_CSV = resolve(process.cwd(), '..', 'docs', 'teams.csv');
const MATCHES_CSV = resolve(process.cwd(), '..', 'docs', 'matches.csv');

// ============================================================================
// CSV HELPERS
// ============================================================================

// Minimal CSV parser tailored to our two well-formed inputs (no quoted
// commas, no escapes). Returns one object per non-empty data row.
function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cells[i] ?? '').trim();
    });
    return row;
  });
}

type CsvTeam = {
  id: number;
  name: string;
  code: string;
  group: string;
  isPlaceholder: boolean;
};

type CsvMatch = {
  id: number;
  matchNumber: number;
  homeTeamId: number | null;
  awayTeamId: number | null;
  stageId: number;
  kickoffAt: Date;
  label: string;
};

// Reads `teams.csv` and normalises rows. Returns null when the file is
// missing so the caller can fall back to the placeholder fixture.
function readTeamsCsv(): CsvTeam[] | null {
  if (!existsSync(TEAMS_CSV)) return null;
  return parseCsv(readFileSync(TEAMS_CSV, 'utf8')).map((row) => ({
    id: Number(row.id),
    name: row.team_name,
    code: row.fifa_code,
    group: row.group_letter,
    isPlaceholder: row.is_placeholder === 'True',
  }));
}

// Reads `matches.csv`. Knockout rows have empty `home_team_id` /
// `away_team_id` cells; those become `null` here and the seed substitutes
// the TBD placeholder team at write time.
function readMatchesCsv(): CsvMatch[] | null {
  if (!existsSync(MATCHES_CSV)) return null;
  return parseCsv(readFileSync(MATCHES_CSV, 'utf8')).map((row) => ({
    id: Number(row.id),
    matchNumber: Number(row.match_number),
    homeTeamId: row.home_team_id === '' ? null : Number(row.home_team_id),
    awayTeamId: row.away_team_id === '' ? null : Number(row.away_team_id),
    stageId: Number(row.stage_id),
    kickoffAt: new Date(row.kickoff_at),
    label: row.match_label,
  }));
}

// Decides which TournamentRound a match belongs to:
//  - Stage 1 (group stage): match_numbers 1-24 → matchday 1,
//    25-48 → matchday 2, 49-72 → matchday 3.
//  - Stages 2-7: direct mapping via STAGE_TO_ORDER.
function orderIndexForMatch(stageId: number, matchNumber: number): number {
  if (stageId === 1) {
    if (matchNumber <= 24) return 1;
    if (matchNumber <= 48) return 2;
    return 3;
  }
  const order = STAGE_TO_ORDER[stageId];
  if (!order) throw new Error(`Unknown stage_id ${stageId} on match ${matchNumber}`);
  return order;
}

// ============================================================================
// SEED STEPS
// ============================================================================

// Upserts the admin user with the configured credentials. Idempotent.
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

// Upserts the nine tournament rounds. Returns orderIndex → round id.
async function seedRounds(): Promise<Map<number, number>> {
  const byIndex = new Map<number, number>();
  for (const r of ROUNDS) {
    const row = await prisma.tournamentRound.upsert({
      where: { orderIndex: r.orderIndex },
      update: {
        name: r.name,
        startsAt: new Date(r.startsAt),
        endsAt: r.endsAt ? new Date(r.endsAt) : null,
        isKnockout: r.isKnockout,
      },
      create: {
        name: r.name,
        orderIndex: r.orderIndex,
        startsAt: new Date(r.startsAt),
        endsAt: r.endsAt ? new Date(r.endsAt) : null,
        isKnockout: r.isKnockout,
      },
    });
    byIndex.set(r.orderIndex, row.id);
  }
  return byIndex;
}

// Maps the obsolete play-off placeholder codes (used until March 2026,
// when UEFA paths A-D and the FIFA inter-confederation playoffs were
// resolved) to the real qualified nations. The seed renames any matching
// rows so existing match references stay valid after the codes change.
const OBSOLETE_PLACEHOLDER_CODES: Record<string, string> = {
  UEPA: 'BIH',
  UEPB: 'SWE',
  UEPC: 'TUR',
  UEPD: 'CZE',
  FP01: 'COD',
  FP02: 'IRQ',
};

// Renames legacy placeholder team rows in-place to their resolved codes
// so the upsert by `code` below updates the existing row instead of
// inserting a duplicate. Skips silently when the old row is missing.
async function migrateObsoletePlaceholderTeams(): Promise<void> {
  for (const [oldCode, newCode] of Object.entries(OBSOLETE_PLACEHOLDER_CODES)) {
    const oldRow = await prisma.team.findUnique({ where: { code: oldCode } });
    if (!oldRow) continue;
    const collision = await prisma.team.findUnique({ where: { code: newCode } });
    if (collision) continue; // new code already present; nothing to migrate.
    await prisma.team.update({ where: { id: oldRow.id }, data: { code: newCode } });
  }
}

// Upserts groups and teams from the CSV. Returns CSV team id → DB team id.
// Also seeds the TBD placeholder team used by knockout matches.
async function seedTeamsFromCsv(teams: CsvTeam[]): Promise<{
  byCsvId: Map<number, number>;
  tbdTeamId: number;
}> {
  // Rename any legacy play-off placeholder rows to their resolved codes
  // before the upsert loop, so existing match references stay intact.
  await migrateObsoletePlaceholderTeams();

  // Groups A..L
  const groupIds = new Map<string, number>();
  const groupLetters = Array.from(new Set(teams.map((t) => t.group))).sort();
  for (const name of groupLetters) {
    const g = await prisma.group.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    groupIds.set(name, g.id);
  }

  const byCsvId = new Map<number, number>();
  for (const t of teams) {
    const flag = FLAG_BY_CODE[t.code] ?? '🏳️';
    const row = await prisma.team.upsert({
      where: { code: t.code },
      update: {
        nameEs: t.name,
        flagEmoji: flag,
        groupId: groupIds.get(t.group) ?? null,
      },
      create: {
        nameEs: t.name,
        code: t.code,
        flagEmoji: flag,
        groupId: groupIds.get(t.group) ?? null,
      },
    });
    byCsvId.set(t.id, row.id);
  }

  // The TBD placeholder isn't part of any group.
  const tbd = await prisma.team.upsert({
    where: { code: TBD_TEAM.code },
    update: { nameEs: TBD_TEAM.name, flagEmoji: TBD_TEAM.flag, groupId: null },
    create: {
      nameEs: TBD_TEAM.name,
      code: TBD_TEAM.code,
      flagEmoji: TBD_TEAM.flag,
      groupId: null,
    },
  });

  return { byCsvId, tbdTeamId: tbd.id };
}

// Creates all 104 matches from the CSV. Skips itself if the DB already
// has any matches — the seed is meant to bootstrap an empty DB.
async function seedMatchesFromCsv(
  matches: CsvMatch[],
  teamByCsvId: Map<number, number>,
  tbdTeamId: number,
  roundIdByOrder: Map<number, number>,
): Promise<number> {
  if ((await prisma.match.count()) > 0) return 0;

  let created = 0;
  for (const m of matches) {
    const orderIndex = orderIndexForMatch(m.stageId, m.matchNumber);
    const roundId = roundIdByOrder.get(orderIndex);
    if (!roundId) throw new Error(`No round for orderIndex ${orderIndex}`);

    // Knockout rows have empty team cells → both sides become TBD and the
    // label is preserved so the admin can identify the slot.
    const homeId = m.homeTeamId !== null ? teamByCsvId.get(m.homeTeamId) : tbdTeamId;
    const awayId = m.awayTeamId !== null ? teamByCsvId.get(m.awayTeamId) : tbdTeamId;
    if (!homeId || !awayId) {
      throw new Error(
        `Match ${m.matchNumber}: unknown team ids ${m.homeTeamId} / ${m.awayTeamId}`,
      );
    }

    const isKnockout = m.stageId > 1;
    const placeholderLabel = m.homeTeamId === null || m.awayTeamId === null ? m.label : null;

    await prisma.match.create({
      data: {
        roundId,
        countsForRoundId: roundId,
        homeTeamId: homeId,
        awayTeamId: awayId,
        scheduledAt: m.kickoffAt,
        isKnockout,
        status: 'scheduled',
        placeholderLabel,
      },
    });
    created += 1;
  }
  return created;
}

// ============================================================================
// FALLBACK (no CSV) — keeps the original placeholder fixture so dev
// machines without the CSV files still work.
// ============================================================================

type PlaceholderTeam = { name: string; code: string; flag: string };
const PLACEHOLDER_TEAMS_BY_GROUP: Record<string, PlaceholderTeam[]> = Object.fromEntries(
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((g) => [
    g,
    [1, 2, 3, 4].map((n) => ({
      name: `Equipo ${g}${n}`,
      code: `${g}${n}X`,
      flag: '🏳️',
    })),
  ]),
);

async function seedPlaceholderFixture(
  roundIdByOrder: Map<number, number>,
): Promise<number> {
  if ((await prisma.match.count()) > 0) return 0;

  const groupIds = new Map<string, number>();
  for (const groupName of Object.keys(PLACEHOLDER_TEAMS_BY_GROUP)) {
    const g = await prisma.group.upsert({
      where: { name: groupName },
      update: {},
      create: { name: groupName },
    });
    groupIds.set(groupName, g.id);
  }

  const teamsByGroup = new Map<string, { id: number }[]>();
  for (const [groupName, teams] of Object.entries(PLACEHOLDER_TEAMS_BY_GROUP)) {
    const created: { id: number }[] = [];
    for (const t of teams) {
      const row = await prisma.team.upsert({
        where: { code: t.code },
        update: { nameEs: t.name, flagEmoji: t.flag, groupId: groupIds.get(groupName) ?? null },
        create: {
          nameEs: t.name,
          code: t.code,
          flagEmoji: t.flag,
          groupId: groupIds.get(groupName) ?? null,
        },
      });
      created.push({ id: row.id });
    }
    teamsByGroup.set(groupName, created);
  }

  // Same FIFA-style round-robin as before.
  let created = 0;
  for (const matchday of [1, 2, 3] as const) {
    const roundId = roundIdByOrder.get(matchday);
    if (!roundId) continue;
    const roundDef = ROUNDS.find((r) => r.orderIndex === matchday)!;
    const base = new Date(roundDef.startsAt).getTime();
    let slot = 0;
    for (const [, teams] of teamsByGroup.entries()) {
      const [t1, t2, t3, t4] = teams;
      const pairs =
        matchday === 1
          ? [[t1, t2], [t3, t4]]
          : matchday === 2
            ? [[t1, t3], [t4, t2]]
            : [[t4, t1], [t2, t3]];
      for (const [home, away] of pairs) {
        await prisma.match.create({
          data: {
            roundId,
            countsForRoundId: roundId,
            homeTeamId: home.id,
            awayTeamId: away.id,
            scheduledAt: new Date(base + slot * 3 * 60 * 60 * 1000),
            isKnockout: false,
            status: 'scheduled',
          },
        });
        slot += 1;
        created += 1;
      }
    }
  }
  return created;
}

// ============================================================================
// ENTRY POINT
// ============================================================================

async function main(): Promise<void> {
  await seedAdmin();
  const roundIdByOrder = await seedRounds();

  const teams = readTeamsCsv();
  const matches = readMatchesCsv();
  let createdMatches = 0;
  let teamsCount = 0;
  let usedCsv = false;

  if (teams && matches) {
    const { byCsvId, tbdTeamId } = await seedTeamsFromCsv(teams);
    teamsCount = teams.length;
    createdMatches = await seedMatchesFromCsv(matches, byCsvId, tbdTeamId, roundIdByOrder);
    usedCsv = true;
  } else {
    createdMatches = await seedPlaceholderFixture(roundIdByOrder);
    teamsCount = Object.values(PLACEHOLDER_TEAMS_BY_GROUP).flat().length;
  }

  /* eslint-disable no-console */
  console.log('Seed completo.');
  console.log(`  Admin: ${ADMIN_EMAIL}`);
  console.log(`  Rondas: ${ROUNDS.length}`);
  console.log(`  Equipos: ${teamsCount}${usedCsv ? '' : ' (placeholders)'}`);
  if (createdMatches > 0) {
    console.log(`  Partidos creados: ${createdMatches}`);
  } else {
    console.log('  Partidos: ya existen, no se modificaron.');
  }
  if (!usedCsv) {
    console.log('');
    console.log('TODO: agregar docs/teams.csv y docs/matches.csv para cargar');
    console.log('      los datos reales del Mundial 2026.');
  }
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
