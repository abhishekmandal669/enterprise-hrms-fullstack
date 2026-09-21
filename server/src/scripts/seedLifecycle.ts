import { PrismaClient } from '@prisma/client';
import { LifecycleService } from '../modules/lifecycle/lifecycleService';

const prisma = new PrismaClient();

export async function seedLifecycle() {
  console.log('Seeding employee onboarding and offboarding lifecycle...');
  const users = await prisma.user.findMany();

  // Initialize onboarding for everyone
  for (const u of users) {
    await LifecycleService.initializeOnboarding(u.id);
  }

  // Mark some onboarding tasks as completed for senior members to show realistic progress
  const admin = users.find(u => u.role === 'ADMIN');
  const tasks = await prisma.onboardingTask.findMany();
  for (let i = 0; i < tasks.length; i++) {
    if (i % 2 === 0) {
      await prisma.onboardingTask.update({
        where: { id: tasks[i].id },
        data: { isCompleted: true, completedAt: new Date() }
      });
    }
  }

  // Seed sample offboarding record for Karan Verma
  const karan = users.find(u => u.firstName.toLowerCase() === 'karan' || u.lastName.toLowerCase() === 'verma');
  if (karan) {
    await LifecycleService.initiateOffboarding(karan.id, {
      resignationDate: '2026-09-01',
      lastWorkingDate: '2026-10-15',
      exitType: 'RESIGNATION',
      reason: 'Pursuing higher studies & international masters program.',
      feedback: 'Great team culture, highly supportive management and excellent technical mentorship.',
      fnfAmount: 85000
    });
    console.log(`✅ Seeded sample offboarding case for ${karan.firstName} ${karan.lastName}`);
  }

  console.log('✅ Lifecycle tasks successfully seeded.');
}

if (require.main === module) {
  seedLifecycle()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
