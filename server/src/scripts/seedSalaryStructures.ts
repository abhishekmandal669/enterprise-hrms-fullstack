import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedSalaryStructures() {
  console.log('Seeding employee salary structures...');
  const users = await prisma.user.findMany({ where: { status: 'ACTIVE' } });

  for (const user of users) {
    let monthlyGross = 65000;
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      monthlyGross = 150000;
    } else if (user.role === 'HR_ADMIN') {
      monthlyGross = 105000;
    } else if (user.role === 'MANAGER') {
      monthlyGross = 125000;
    } else if (user.designation?.toLowerCase().includes('lead') || user.designation?.toLowerCase().includes('architect')) {
      monthlyGross = 95000;
    }

    const basic = Number((monthlyGross * 0.5).toFixed(2));
    const hra = Number((basic * 0.4).toFixed(2));
    const da = Number((monthlyGross * 0.1).toFixed(2));
    const specialAllowance = Number((monthlyGross - (basic + hra + da)).toFixed(2));
    const pfEmployee = 1800; // Statutory capped or 12%
    const pfEmployer = 1800;
    const esi = monthlyGross <= 21000 ? Number((monthlyGross * 0.0075).toFixed(2)) : 0;
    const professionalTax = 200;
    const tds = monthlyGross > 100000 ? Number((monthlyGross * 0.1).toFixed(2)) : Number((monthlyGross * 0.05).toFixed(2));

    await prisma.salaryStructure.upsert({
      where: { userId: user.id },
      update: {
        monthlyGross,
        basic,
        hra,
        da,
        specialAllowance,
        pfEmployee,
        pfEmployer,
        esi,
        professionalTax,
        tds,
        currency: 'INR'
      },
      create: {
        userId: user.id,
        monthlyGross,
        basic,
        hra,
        da,
        specialAllowance,
        pfEmployee,
        pfEmployer,
        esi,
        professionalTax,
        tds,
        currency: 'INR'
      }
    });
  }

  console.log(`✅ Seeded salary structures for ${users.length} active employees.`);
}

if (require.main === module) {
  seedSalaryStructures()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
