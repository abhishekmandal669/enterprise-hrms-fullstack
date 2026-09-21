import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updates: Record<string, string> = {
    'admin@lexvera.com': '2022-01-10',
    'manager@lexvera.com': '2024-03-15',
    'hr@lexvera.com': '2023-09-22',
    'employee@lexvera.com': '2025-09-18',
    'ananya.v@lexvera.com': '2025-02-14',
    'karan.m@lexvera.com': '2025-09-28',
    'sneha.p@lexvera.com': '2026-08-20',
    'arun.k@lexvera.com': '2026-09-02',
    'rohit.s@lexvera.com': '2026-09-12'
  };

  for (const [email, joiningDate] of Object.entries(updates)) {
    await prisma.user.updateMany({
      where: { email },
      data: { joiningDate }
    });
  }

  // Also ensure all other active users have a valid joining date
  const allUsers = await prisma.user.findMany({ where: { joiningDate: null } });
  for (const u of allUsers) {
    const createdStr = u.createdAt.toISOString().split('T')[0];
    await prisma.user.update({
      where: { id: u.id },
      data: { joiningDate: createdStr }
    });
  }

  console.log('All user joining dates updated successfully.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
