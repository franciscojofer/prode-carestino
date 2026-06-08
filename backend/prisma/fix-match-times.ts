// File: backend/prisma/fix-match-times.ts
// Purpose: One-off corrective script that fixes the `scheduledAt` of the
// group-stage matches without touching teams, results or predictions.
// Functionality:
//   1. Reads docs/matches.csv (the corrected source of truth) and
//      docs/teams.csv.
//   2. For every group-stage row (stage_id = 1) it resolves the home/away
//      teams by their FIFA code and locates the existing Match by that
//      exact pairing.
//   3. Updates ONLY `scheduledAt`. The match row — and therefore every
//      prediction and result already attached to it — is preserved; the
//      cruce simply moves to its correct kick-off time.
// Role: Run once on the server after the kick-off times were found to be
//   scrambled. Idempotent: re-running it leaves an already-correct DB
//   unchanged. Invoke with `npx tsx prisma/fix-match-times.ts`.

import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// CSV paths, resolved from the project root just like seed.ts.
const MATCHES_CSV = resolve(process.cwd(), '..', 'docs', 'matches.csv');
const TEAMS_CSV = resolve(process.cwd(), '..', 'docs', 'teams.csv');

// Minimal CSV parser (no quoted fields), shared shape with seed.ts.
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

// Builds "csv team id" -> "fifa code" from teams.csv so we can translate the
// numeric ids used in matches.csv into the stable code stored in the DB.
function readTeamCodeByCsvId(): Map<number, string> {
  if (!existsSync(TEAMS_CSV)) throw new Error(`No se encontró ${TEAMS_CSV}`);
  const map = new Map<number, string>();
  for (const row of parseCsv(readFileSync(TEAMS_CSV, 'utf8'))) {
    const id = Number(row.id);
    if (Number.isFinite(id) && row.fifa_code) map.set(id, row.fifa_code);
  }
  return map;
}

// One corrected group-stage match: the team codes that identify the cruce
// plus the right kick-off instant.
type FixRow = {
  matchNumber: number;
  homeCode: string;
  awayCode: string;
  scheduledAt: Date;
};

// Reads matches.csv and keeps only group-stage rows with both teams known.
function readFixRows(codeByCsvId: Map<number, string>): FixRow[] {
  if (!existsSync(MATCHES_CSV)) throw new Error(`No se encontró ${MATCHES_CSV}`);
  const out: FixRow[] = [];
  for (const row of parseCsv(readFileSync(MATCHES_CSV, 'utf8'))) {
    if (Number(row.stage_id) !== 1) continue; // group stage only
    if (row.home_team_id === '' || row.away_team_id === '') continue;
    const homeCode = codeByCsvId.get(Number(row.home_team_id));
    const awayCode = codeByCsvId.get(Number(row.away_team_id));
    if (!homeCode || !awayCode) {
      throw new Error(`matches.csv fila ${row.id}: equipo desconocido`);
    }
    const scheduledAt = new Date(row.kickoff_at);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new Error(`matches.csv fila ${row.id}: kickoff_at inválido "${row.kickoff_at}"`);
    }
    out.push({ matchNumber: Number(row.match_number), homeCode, awayCode, scheduledAt });
  }
  return out;
}

async function main(): Promise<void> {
  const codeByCsvId = readTeamCodeByCsvId();
  const rows = readFixRows(codeByCsvId);

  // code -> DB team id, resolved once.
  const teamIdByCode = new Map<string, number>();
  for (const t of await prisma.team.findMany({ select: { id: true, code: true } })) {
    teamIdByCode.set(t.code, t.id);
  }

  let updated = 0;
  let alreadyOk = 0;
  const notFound: string[] = [];

  for (const r of rows) {
    const homeId = teamIdByCode.get(r.homeCode);
    const awayId = teamIdByCode.get(r.awayCode);
    if (!homeId || !awayId) {
      notFound.push(`${r.homeCode} vs ${r.awayCode} (equipo no está en la BD)`);
      continue;
    }

    // Locate the cruce by its exact pairing. Try the swapped order too in
    // case home/away were stored inverted — the time is the same either way.
    const match =
      (await prisma.match.findFirst({ where: { homeTeamId: homeId, awayTeamId: awayId } })) ??
      (await prisma.match.findFirst({ where: { homeTeamId: awayId, awayTeamId: homeId } }));

    if (!match) {
      notFound.push(`${r.homeCode} vs ${r.awayCode} (cruce no encontrado)`);
      continue;
    }

    if (match.scheduledAt.getTime() === r.scheduledAt.getTime()) {
      alreadyOk += 1;
      continue;
    }

    await prisma.match.update({
      where: { id: match.id },
      data: { scheduledAt: r.scheduledAt },
    });
    updated += 1;
    // eslint-disable-next-line no-console
    console.log(
      `  ${r.homeCode} vs ${r.awayCode}: ` +
        `${match.scheduledAt.toISOString()} -> ${r.scheduledAt.toISOString()}`,
    );
  }

  /* eslint-disable no-console */
  console.log('---');
  console.log(`Cruces procesados: ${rows.length}`);
  console.log(`Horarios corregidos: ${updated}`);
  console.log(`Ya estaban bien: ${alreadyOk}`);
  if (notFound.length > 0) {
    console.log(`Sin coincidencia (${notFound.length}):`);
    notFound.forEach((n) => console.log(`  - ${n}`));
  }
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
