// File: backend/prisma/seed-dev.ts
// Purpose: Development-only seed that layers a tiny fixture on top of the
// production admin seed so the predictions, scoring and tournament endpoints
// can be exercised by hand with curl.
// Functionality: Creates 4 teams in one group, 2 rounds (one active, one
// future) and 3 matches (one finished, one open for predictions, one in a
// future round). Idempotent for the user/admin row; rebuilds fixture rows
// on every run to keep the dataset predictable.
// Role: Local-only tool. NOT safe to run against production data.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'SSGG_admin_2410';
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, isAdmin: true, isActive: true },
    create: {
      nombre: 'Admin',
      apellido: 'Carestino',
      cuil: '00-00000000-0',
      email: adminEmail,
      passwordHash,
      isAdmin: true,
      isActive: true,
    },
  });
}

// Wipes the dev fixture (predictions, matches, teams, groups, rounds) and
// rebuilds it. Keeps user accounts intact.
async function rebuildFixture() {
  await prisma.prediction.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.user.updateMany({ data: { joinedRoundId: null } });
  await prisma.team.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.tournamentRound.deleteMany({});

  // Anchors used for relative scheduling so the seed stays "active" no
  // matter when it is run.
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const inAWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Rounds. Round 1 is active (started yesterday, ends in three days).
  const round1 = await prisma.tournamentRound.create({
    data: {
      name: 'Fase de Grupos - Fecha 1',
      orderIndex: 1,
      startsAt: yesterday,
      endsAt: inThreeDays,
      isKnockout: false,
    },
  });
  const round2 = await prisma.tournamentRound.create({
    data: {
      name: 'Fase de Grupos - Fecha 2',
      orderIndex: 2,
      startsAt: inThreeDays,
      endsAt: inAWeek,
      isKnockout: false,
    },
  });
  const round3 = await prisma.tournamentRound.create({
    data: {
      name: 'Octavos',
      orderIndex: 4,
      startsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      isKnockout: true,
    },
  });

  // Group "X" with four teams. Names mimic the Argentine-Spanish style used
  // by the real seed in block 5.
  const groupX = await prisma.group.create({ data: { name: 'X' } });
  const arg = await prisma.team.create({
    data: { nameEs: 'Argentina', code: 'ARG', flagEmoji: '🇦🇷', groupId: groupX.id },
  });
  const bra = await prisma.team.create({
    data: { nameEs: 'Brasil', code: 'BRA', flagEmoji: '🇧🇷', groupId: groupX.id },
  });
  const uru = await prisma.team.create({
    data: { nameEs: 'Uruguay', code: 'URU', flagEmoji: '🇺🇾', groupId: groupX.id },
  });
  const chi = await prisma.team.create({
    data: { nameEs: 'Chile', code: 'CHI', flagEmoji: '🇨🇱', groupId: groupX.id },
  });

  // Match 1: finished in round 1 (yesterday). Result 2-1.
  await prisma.match.create({
    data: {
      roundId: round1.id,
      countsForRoundId: round1.id,
      homeTeamId: arg.id,
      awayTeamId: bra.id,
      scheduledAt: twoDaysAgo,
      kickoffAt: twoDaysAgo,
      homeGoals: 2,
      awayGoals: 1,
      status: 'finished',
      isKnockout: false,
    },
  });

  // Match 2: editable, scheduled for tomorrow in round 1.
  await prisma.match.create({
    data: {
      roundId: round1.id,
      countsForRoundId: round1.id,
      homeTeamId: uru.id,
      awayTeamId: chi.id,
      scheduledAt: tomorrow,
      isKnockout: false,
    },
  });

  // Match 3: knockout in the future to exercise the no-draw guard.
  await prisma.match.create({
    data: {
      roundId: round3.id,
      countsForRoundId: round3.id,
      homeTeamId: arg.id,
      awayTeamId: bra.id,
      scheduledAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      isKnockout: true,
    },
  });

  // Existing demo user (if any) joins from round 1 so their predictions
  // count for the full tournament.
  await prisma.user.updateMany({
    where: { email: { not: process.env.ADMIN_EMAIL ?? 'admin' } },
    data: { joinedRoundId: round1.id },
  });

  // eslint-disable-next-line no-console
  console.log('Dev fixture seeded:');
  // eslint-disable-next-line no-console
  console.log(`  - Active round: ${round1.name} (id=${round1.id})`);
  // eslint-disable-next-line no-console
  console.log(`  - Future round: ${round2.name} (id=${round2.id})`);
  // eslint-disable-next-line no-console
  console.log(`  - Knockout round: ${round3.name} (id=${round3.id})`);
  // eslint-disable-next-line no-console
  console.log(`  - Group X with 4 teams. Matches: ARG-BRA (finished), URU-CHI (open), ARG-BRA (knockout).`);
}

async function main(): Promise<void> {
  await seedAdmin();
  await rebuildFixture();
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
