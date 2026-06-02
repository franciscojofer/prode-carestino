// File: backend/prisma/update-kickoffs.ts
// Purpose: One-shot patch script that updates `Match.scheduledAt` from
// the corrected `docs/matches.csv` without touching any other field
// (predictions, results, users — everything else stays intact).
// Functionality: Reads matches.csv, matches each row by `match_number`
// against the DB (assuming insertion order matches match_number, which
// is how the seed loads them) and updates only the kickoff timestamp.
// Role: Run once after fixing the kickoff times in matches.csv. Idempotent.

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MATCHES_CSV = resolve(process.cwd(), '..', 'docs', 'matches.csv');

// Minimal CSV parser (same shape as seed.ts).
function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
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

async function main() {
  const rows = parseCsv(readFileSync(MATCHES_CSV, 'utf8'));
  // The DB Match.id values come from the seed's insertion order, which
  // matches the CSV row order. So `csvRow.id === db.match.id` for every
  // match created by the seed.
  let updated = 0;
  for (const row of rows) {
    const id = Number(row.id);
    const scheduledAt = new Date(row.kickoff_at);
    if (Number.isNaN(scheduledAt.getTime())) {
      console.warn(`Skipping match ${id}: invalid date ${row.kickoff_at}`);
      continue;
    }
    const result = await prisma.match.updateMany({
      where: { id },
      data: { scheduledAt },
    });
    if (result.count > 0) updated += 1;
  }
  console.log(`Updated kickoff for ${updated} matches.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
