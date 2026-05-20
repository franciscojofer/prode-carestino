// Seed inicial — Prode Carestino Mundial 2026
//
// Este archivo se completa en el bloque 5. Por ahora es un placeholder que sólo
// crea el usuario admin para permitir login en cuanto haya endpoints de auth.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
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

  // TODO (bloque 5): poblar TournamentRound, Group, Team, Match con
  // el fixture oficial del Mundial 2026 (verificar manualmente).

  // eslint-disable-next-line no-console
  console.log(`Seed completo. Admin: ${adminEmail}`);
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
