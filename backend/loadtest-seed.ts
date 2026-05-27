// File: backend/loadtest-seed.ts
// Purpose: Populate the loadtest database with a realistic dataset (~150
// users, full World Cup fixture, predictions for every user) so we can
// benchmark the hot endpoints under conditions similar to production.
// Role: One-shot script invoked by the load test runner. Not part of the
// runtime image.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const NUM_USERS = 150;
const NUM_GROUPS = 12;
const TEAMS_PER_GROUP = 4;
const ROUNDS = ['Fecha 1', 'Fecha 2', 'Fecha 3', 'Octavos', 'Cuartos'];
const MATCHES_PER_GROUP_ROUND = 2;
const KO_MATCHES_PER_ROUND = 8;

async function main() {
  console.log('Wiping...');
  await prisma.prediction.deleteMany({});
  await prisma.match.deleteMany({});
  await prisma.user.updateMany({ data: { joinedRoundId: null } });
  await prisma.loginAttempt.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.tournamentRound.deleteMany({});

  console.log('Creating groups and teams...');
  const teamIds: number[] = [];
  for (let g = 0; g < NUM_GROUPS; g++) {
    const group = await prisma.group.create({
      data: { name: String.fromCharCode(65 + g) },
    });
    for (let t = 0; t < TEAMS_PER_GROUP; t++) {
      const team = await prisma.team.create({
        data: {
          nameEs: `Equipo ${group.name}${t + 1}`,
          code: `${group.name}${t + 1}`,
          flagEmoji: '🏳️',
          groupId: group.id,
        },
      });
      teamIds.push(team.id);
    }
  }

  console.log('Creating rounds...');
  const now = new Date();
  const roundIds: number[] = [];
  for (let i = 0; i < ROUNDS.length; i++) {
    const r = await prisma.tournamentRound.create({
      data: {
        name: ROUNDS[i],
        orderIndex: i + 1,
        startsAt: new Date(now.getTime() - (ROUNDS.length - i) * 86400000),
        isKnockout: i >= 3,
      },
    });
    roundIds.push(r.id);
  }

  console.log('Creating matches...');
  const matchIds: number[] = [];
  // Group stage: 3 rounds, each with 2 matches per group = 24 per round.
  for (let r = 0; r < 3; r++) {
    for (let g = 0; g < NUM_GROUPS; g++) {
      const groupTeams = teamIds.slice(g * TEAMS_PER_GROUP, (g + 1) * TEAMS_PER_GROUP);
      const pairs = [
        [groupTeams[0], groupTeams[1]],
        [groupTeams[2], groupTeams[3]],
      ];
      for (let p = 0; p < MATCHES_PER_GROUP_ROUND; p++) {
        const m = await prisma.match.create({
          data: {
            roundId: roundIds[r],
            countsForRoundId: roundIds[r],
            homeTeamId: pairs[p][0],
            awayTeamId: pairs[p][1],
            scheduledAt: new Date(now.getTime() - (3 - r) * 86400000),
            homeGoals: Math.floor(Math.random() * 4),
            awayGoals: Math.floor(Math.random() * 4),
            status: 'finished',
            isKnockout: false,
          },
        });
        matchIds.push(m.id);
      }
    }
  }
  // Knockouts: rounds 4 and 5, with 8 matches each.
  for (let r = 3; r < 5; r++) {
    for (let k = 0; k < KO_MATCHES_PER_ROUND; k++) {
      const home = teamIds[(k * 2) % teamIds.length];
      const away = teamIds[(k * 2 + 1) % teamIds.length];
      const m = await prisma.match.create({
        data: {
          roundId: roundIds[r],
          countsForRoundId: roundIds[r],
          homeTeamId: home,
          awayTeamId: away,
          scheduledAt: new Date(now.getTime() - (5 - r) * 86400000),
          homeGoals: Math.floor(Math.random() * 4),
          awayGoals: Math.floor(Math.random() * 4),
          status: 'finished',
          isKnockout: true,
        },
      });
      matchIds.push(m.id);
    }
  }

  console.log(`Creating ${NUM_USERS} users + predictions...`);
  // One shared password hash to avoid 150x bcrypt calls.
  const passwordHash = await bcrypt.hash('test', 4);
  for (let u = 0; u < NUM_USERS; u++) {
    const user = await prisma.user.create({
      data: {
        nombre: `User${u}`,
        apellido: 'Test',
        cuil: `00-${String(u).padStart(8, '0')}-0`,
        email: `user${u}@test.local`,
        passwordHash,
        isAdmin: false,
        isActive: true,
        joinedRoundId: roundIds[0],
      },
    });
    // Bulk insert predictions for this user (one per match).
    await prisma.prediction.createMany({
      data: matchIds.map((matchId) => ({
        userId: user.id,
        matchId,
        homeGoals: Math.floor(Math.random() * 4),
        awayGoals: Math.floor(Math.random() * 4),
        pointsAwarded: Math.floor(Math.random() * 5),
        isExact: Math.random() < 0.2,
      })),
    });
  }

  // Admin user.
  await prisma.user.create({
    data: {
      nombre: 'Admin',
      apellido: 'Test',
      cuil: '00-99999999-0',
      email: 'admin',
      passwordHash,
      isAdmin: true,
      isActive: true,
    },
  });

  const stats = {
    users: await prisma.user.count(),
    matches: await prisma.match.count(),
    predictions: await prisma.prediction.count(),
  };
  console.log('Seeded:', stats);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
