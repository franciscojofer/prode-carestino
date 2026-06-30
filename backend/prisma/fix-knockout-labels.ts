// File: backend/prisma/fix-knockout-labels.ts
// Purpose: One-shot patch script that re-syncs `Match.placeholderLabel` from
// `docs/matches.csv` without touching any other field (teams, results,
// schedule — everything else stays intact).
// Functionality: Reads matches.csv and, for every knockout slot row (one with
// empty home/away team cells), writes its FIFA slot label ("W74 vs W77") onto
// the matching DB row by id. Used to correct labels that were seeded wrong
// (e.g. matches 89/90 had their pairings swapped vs the official schedule),
// which the bracket relies on to lay out the tree.
// Role: Run once after fixing the labels in matches.csv. Idempotent.

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const MATCHES_CSV = resolve(process.cwd(), '..', 'docs', 'matches.csv');

// Minimal CSV parser (same shape as seed.ts / update-kickoffs.ts).
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
  // The DB Match.id values come from the seed's insertion order, which matches
  // the CSV row order, so `csvRow.id === db.match.id`.
  let updated = 0;
  for (const row of rows) {
    // Only knockout slots carry a placeholder label (both team cells empty).
    const isKnockoutSlot = row.home_team_id === '' || row.away_team_id === '';
    if (!isKnockoutSlot) continue;
    const id = Number(row.id);
    const result = await prisma.match.updateMany({
      where: { id },
      data: { placeholderLabel: row.match_label },
    });
    if (result.count > 0) updated += 1;
  }
  console.log(`Updated placeholderLabel for ${updated} knockout matches.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
