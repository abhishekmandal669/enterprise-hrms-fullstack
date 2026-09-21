import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SendMailOptions {
  senderId: string;
  toUserIds: string[];
  ccUserIds?: string[];
  bccUserIds?: string[];
  subject: string;
  body: string;
  category?: 'GENERAL' | 'ANNOUNCEMENT' | 'LEAVE' | 'ATTENDANCE' | 'TIMESHEET' | 'POLICY';
  isSystemEmail?: boolean;
  threadId?: string;
  attachments?: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
}

export class InternalMailService {
  /**
   * Generates a unique, standardized official company email handle:
   * Pattern: `firstName.lastName@lexvera.internal`
   * In case of collision: `firstName.lastName1@lexvera.internal`, etc.
   */
  static async generateOfficialEmail(firstName: string, lastName: string, excludeUserId?: string): Promise<string> {
    const cleanFirst = (firstName || 'employee')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '');

    const cleanLast = (lastName || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '');

    const baseHandle = cleanLast ? `${cleanFirst}.${cleanLast}` : cleanFirst;
    const domain = 'lexvera.internal';
    let candidateEmail = `${baseHandle}@${domain}`;

    let counter = 1;
    while (true) {
      const existing = await prisma.user.findFirst({
        where: {
          officialEmail: candidateEmail,
          ...(excludeUserId ? { id: { not: excludeUserId } } : {})
        }
      });

      if (!existing) {
        return candidateEmail;
      }

      candidateEmail = `${baseHandle}${counter}@${domain}`;
      counter++;
    }
  }

  /**
   * Dispatches an internal email to specified recipients.
   */
  static async sendEmail(options: SendMailOptions) {
    const {
      senderId,
      toUserIds,
      ccUserIds = [],
      bccUserIds = [],
      subject,
      body,
      category = 'GENERAL',
      isSystemEmail = false,
      threadId,
      attachments = []
    } = options;

    if (!toUserIds || toUserIds.length === 0) {
      throw new Error('At least one recipient is required');
    }

    if (!subject || subject.trim() === '') {
      throw new Error('Subject is required');
    }

    // Create the InternalEmail parent record
    const email = await prisma.internalEmail.create({
      data: {
        senderId,
        subject: subject.trim(),
        body: body || '',
        category,
        isSystemEmail,
        threadId: threadId || undefined, // defaults to uuid in schema
        attachments: {
          create: attachments.map(att => ({
            fileName: att.fileName,
            fileUrl: att.fileUrl,
            fileSize: att.fileSize || 0,
            mimeType: att.mimeType || 'application/octet-stream'
          }))
        }
      }
    });

    // Prepare recipient records
    const recipientRows: Array<{
      emailId: string;
      userId: string;
      recipientType: string;
    }> = [];

    // Deduplicate recipient IDs while preserving primary type priority
    const processedUserIds = new Set<string>();

    for (const uid of toUserIds) {
      if (uid && !processedUserIds.has(uid)) {
        processedUserIds.add(uid);
        recipientRows.push({ emailId: email.id, userId: uid, recipientType: 'TO' });
      }
    }

    for (const uid of ccUserIds) {
      if (uid && !processedUserIds.has(uid)) {
        processedUserIds.add(uid);
        recipientRows.push({ emailId: email.id, userId: uid, recipientType: 'CC' });
      }
    }

    for (const uid of bccUserIds) {
      if (uid && !processedUserIds.has(uid)) {
        processedUserIds.add(uid);
        recipientRows.push({ emailId: email.id, userId: uid, recipientType: 'BCC' });
      }
    }

    // Insert all recipients
    if (recipientRows.length > 0) {
      await prisma.internalEmailRecipient.createMany({
        data: recipientRows
      });
    }

    return email;
  }

  /**
   * System Notification Email Generator
   * Triggered by HR workflows: Leaves, Attendance, Announcements, Onboarding.
   */
  static async sendSystemEmail(
    recipientUserIds: string | string[],
    subject: string,
    body: string,
    category: 'GENERAL' | 'ANNOUNCEMENT' | 'LEAVE' | 'ATTENDANCE' | 'TIMESHEET' | 'POLICY' = 'GENERAL'
  ) {
    try {
      const uids = Array.isArray(recipientUserIds) ? recipientUserIds : [recipientUserIds];
      if (uids.length === 0) return null;

      // Find an Admin or HR_ADMIN user as the system sender
      let systemSender = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true }
      });

      if (!systemSender) {
        systemSender = await prisma.user.findFirst({
          select: { id: true }
        });
      }

      if (!systemSender) {
        console.warn('[InternalMailService] No user available to send system email.');
        return null;
      }

      return await this.sendEmail({
        senderId: systemSender.id,
        toUserIds: uids,
        subject,
        body,
        category,
        isSystemEmail: true
      });
    } catch (err) {
      console.error('[InternalMailService] Failed to send system email:', err);
      return null;
    }
  }
}
