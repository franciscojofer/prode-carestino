// File: backend/prisma/sync-schedule.ts
// Purpose: Refreshes the `scheduledAt` field of existing matches using the
// kick-off times in `docs/schedule.csv` (one row per match, times in
// Argentina local time UTC-3).
// Functionality:
//   1. Loads the CSV and validates the row count (must be exactly 104 to
//      match the seeded fixture).
//   2. Sanity-checks the DB against the original `docs/matches.csv` so we
//      only update when CSV.match_id maps to Match.id (the case right
//      after a fresh seed run).
//   3. For each row, converts `date_arg` + `time_arg` to UTC and runs
//      `UPDATE Match SET scheduledAt = ? WHERE id = ?`.
// Role: Idempotent maintenance script. Run with `npm run sync:schedule`
// whenever the official kick-off times change.

import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// CSV paths resolved relative to the project root so the script works
// regardless of where node is invoked from (matches `seed.ts`).
const SCHEDULE_CSV = resolve(process.cwd(), '..', 'docs', 'schedule.csv');
const MATCHES_CSV = resolve(process.cwd(), '..', 'docs', 'matches.csv');

// Total matches that the seed loads; the script refuses to run unless the
// DB has exactly this number (avoids silently skipping rows).
const EXPECTED_MATCH_COUNT = 104;

// Argentina has no daylight saving — UTC-3 year-round.
const ART_OFFSET = '-00:00';

// Minimal CSV parser shared with `seed.ts`. Strips the UTF-8 BOM that
// Excel sometimes prepends so the first header isn't mis-parsed.
function parseCsv(content: string): Record<string, string>[] {
  const stripped = content.replace(/^﻿/, '');
  const lines = stripped.split(/\r?\n/).filter((l) => l.trim().length > 0);
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

// One normalised row from `schedule.csv`.
type ScheduleRow = {
  matchId: number;
  scheduledAt: Date;
};

// Parses `schedule.csv` and converts each row's ART date+time pair to a
// real UTC `Date`. Throws if any row is malformed so the caller aborts
// before issuing a single UPDATE.
function readScheduleCsv(): ScheduleRow[] {
  if (!existsSync(SCHEDULE_CSV)) {
    throw new Error(`No se encontró ${SCHEDULE_CSV}`);
  }
  const rows = parseCsv(readFileSync(SCHEDULE_CSV, 'utf8'));
  return rows.map((row, idx) => {
    const matchId = Number(row.match_id);
    if (!Number.isFinite(matchId) || matchId <= 0) {
      throw new Error(`Fila ${idx + 2}: match_id inválido "${row.match_id}"`);
    }
    const date = row.date_arg;
    const time = row.time_arg;
    if (!date || !time) {
      throw new Error(`Fila ${idx + 2} (match ${matchId}): falta date_arg o time_arg`);
    }
    // Build an ISO 8601 string with the Argentina offset so the JS Date
    // constructor stores the correct UTC instant.
    const iso = `${date}T${time.length === 5 ? time : time.slice(0, 5)}:00${ART_OFFSET}`;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      throw new Error(`Fila ${idx + 2} (match ${matchId}): fecha/hora inválida "${iso}"`);
    }
    return { matchId, scheduledAt: d };
  });
}

// Reads the original `matches.csv` so we can confirm that CSV.match_id
// lines up with Match.id in the DB before updating anything.
type OriginalRow = {
  matchNumber: number;
  homeTeamId: number | null;
  awayTeamId: number | null;
};
function readOriginalMatchesCsv(): OriginalRow[] | null {
  if (!existsSync(MATCHES_CSV)) return null;
  return parseCsv(readFileSync(MATCHES_CSV, 'utf8')).map((row) => ({
    matchNumber: Number(row.match_number),
    homeTeamId: row.home_team_id === '' ? null : Number(row.home_team_id),
    awayTeamId: row.away_team_id === '' ? null : Number(row.away_team_id),
  }));
}

// Aborts the run unless the DB looks like it was seeded from `matches.csv`
// in order, with no extra inserts that would have shifted the autoincrement
// IDs. Checks (a) total count and (b) a handful of group-stage rows where
// both team ids are deterministic.
async function assertDbMatchesSeedOrder(): Promise<void> {
  const count = await prisma.match.count();
  if (count !== EXPECTED_MATCH_COUNT) {
    throw new Error(
      `La base tiene ${count} partidos, esperábamos ${EXPECTED_MATCH_COUNT}. ` +
      `Asegurate de correr este script solo después de un seed limpio.`,
    );
  }

  const original = readOriginalMatchesCsv();
  if (!original) {
    // Without the source CSV we can't cross-check ids; skip the deeper
    // validation but warn the operator.
    // eslint-disable-next-line no-console
    console.warn(
      'No se encontró docs/matches.csv para validar IDs; ' +
      'continuando confiando en el orden del seed.',
    );
    return;
  }

  // Cross-check three group-stage rows whose home/away ids are explicit
  // in matches.csv (rows 1, 12 and 24 cover three different groups and
  // matchdays — enough to catch a shifted autoincrement).
  const samples = [1, 12, 24];
  const teamByCsvId = await buildCsvTeamIdMap();
  for (const matchNumber of samples) {
    const src = original.find((r) => r.matchNumber === matchNumber);
    if (!src || src.homeTeamId === null || src.awayTeamId === null) continue;
    const dbMatch = await prisma.match.findUnique({
      where: { id: matchNumber },
      select: { homeTeamId: true, awayTeamId: true },
    });
    if (!dbMatch) {
      throw new Error(`No existe Match.id=${matchNumber} en la base.`);
    }
    const expectedHome = teamByCsvId.get(src.homeTeamId);
    const expectedAway = teamByCsvId.get(src.awayTeamId);
    if (
      expectedHome !== dbMatch.homeTeamId ||
      expectedAway !== dbMatch.awayTeamId
    ) {
      throw new Error(
        `Validación falló en match ${matchNumber}: ` +
        `DB tiene equipos (${dbMatch.homeTeamId}, ${dbMatch.awayTeamId}) ` +
        `pero matches.csv dice (${expectedHome}, ${expectedAway}). ` +
        `Los IDs no coinciden con el orden del seed.`,
      );
    }
  }
}

// Builds a map "id en teams.csv" → "id en la tabla Team", looking up by
// fifa_code which is the only stable identifier across both files.
async function buildCsvTeamIdMap(): Promise<Map<number, number>> {
  const teamsCsv = resolve(process.cwd(), '..', 'docs', 'teams.csv');
  if (!existsSync(teamsCsv)) return new Map();
  const rows = parseCsv(readFileSync(teamsCsv, 'utf8'));
  const map = new Map<number, number>();
  for (const row of rows) {
    const csvId = Number(row.id);
    const code = row.fifa_code;
    if (!Number.isFinite(csvId) || !code) continue;
    const dbTeam = await prisma.team.findUnique({ where: { code } });
    if (dbTeam) map.set(csvId, dbTeam.id);
  }
  return map;
}

async function main(): Promise<void> {
  const schedule = readScheduleCsv();
  if (schedule.length !== EXPECTED_MATCH_COUNT) {
    throw new Error(
      `schedule.csv tiene ${schedule.length} filas, esperábamos ${EXPECTED_MATCH_COUNT}.`,
    );
  }

  await assertDbMatchesSeedOrder();

  let updated = 0;
  for (const row of schedule) {
    const result = await prisma.match.updateMany({
      where: { id: row.matchId },
      data: { scheduledAt: row.scheduledAt },
    });
    if (result.count === 1) updated += 1;
  }

  /* eslint-disable no-console */
  console.log(`Sync completo. ${updated}/${schedule.length} partidos actualizados.`);
  /* eslint-enable no-console */
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
