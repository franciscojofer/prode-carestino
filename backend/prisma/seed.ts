// File: backend/prisma/seed.ts
// Purpose: Idempotent seed script that bootstraps an empty database.
// Functionality: Creates (or refreshes) the seeded admin user using the
// credentials from the environment. Tournament data (rounds, groups, teams,
// matches) is added in block 5 of the implementation plan.
// Role: Run once after `prisma migrate dev` via `npm run seed`. Safe to run
// repeatedly — it upserts instead of inserting blindly.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Ensures the seeded admin account exists with the configured credentials.
// Side effects: writes one row to `User`.
async function seedAdmin(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'SSGG_admin_2410';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, isAdmin: true, isActive: true },
    create: {
      nombre: 'Admin',
      apellido: 'Carestino',
      // CUIL is required by the schema but irrelevant for the system user.
      cuil: '00-00000000-0',
      email: adminEmail,
      passwordHash,
      isAdmin: true,
      isActive: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Seed completo. Admin: ${adminEmail}`);
}

async function main(): Promise<void> {
  await seedAdmin();

  // TODO (block 5): populate TournamentRound, Group, Team and Match with
  // the official Mundial 2026 fixture (must be verified manually).
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
