import { PrismaClient } from '@prisma/client';
import { InternalMailService } from '../services/internalMailService';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding official emails for existing users...');
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' }
  });

  console.log(`Found ${users.length} users.`);

  for (const user of users) {
    if (!user.officialEmail) {
      const officialEmail = await InternalMailService.generateOfficialEmail(
        user.firstName,
        user.lastName,
        user.id
      );

      await prisma.user.update({
        where: { id: user.id },
        data: { officialEmail }
      });

      console.log(`Assigned ${officialEmail} to ${user.firstName} ${user.lastName} (${user.role})`);
    } else {
      console.log(`User ${user.firstName} ${user.lastName} already has official email: ${user.officialEmail}`);
    }
  }

  // Create initial Welcome system announcement email if no emails exist
  const emailCount = await prisma.internalEmail.count();
  if (emailCount === 0) {
    console.log('Creating initial welcome email for all users...');
    const admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (admin) {
      const allUserIds = users.map(u => u.id);

      await InternalMailService.sendEmail({
        senderId: admin.id,
        toUserIds: allUserIds,
        subject: 'Welcome to Lexvera Enterprise Webmail & Internal Messaging',
        body: `
          <p>Dear Team,</p>
          <p>We are delighted to announce the rollout of <strong>Lexvera Enterprise Internal Webmail</strong>.</p>
          <p>Every employee now has an official company email address format: <code>firstname.lastname@lexvera.internal</code>.</p>
          <p>Key Features available in your new webmail:</p>
          <ul>
            <li>Secure, internal 1-on-1 and group corporate communications</li>
            <li>Automatic notifications for leave approvals, attendance updates, and company announcements</li>
            <li>Zero external spam, complete audit compliance</li>
          </ul>
          <p>Feel free to explore your inbox, compose messages to team members, and manage your threads.</p>
          <br/>
          <p>Warm regards,<br/><strong>HR Operations & IT Administration</strong><br/>Lexvera Technologies</p>
        `,
        category: 'ANNOUNCEMENT',
        isSystemEmail: false
      });

      console.log('Welcome email dispatched successfully to all users.');
    }
  }

  console.log('Official email seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
