import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate } from '../../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// 1. Get User's Notifications
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;

    const recipientRecords = await prisma.notificationRecipient.findMany({
      where: { userId },
      include: { notification: true },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    const notifications = recipientRecords.map(r => ({
      id: r.id,
      title: r.notification.title,
      body: r.notification.body,
      eventType: r.notification.eventType,
      isRead: r.isRead,
      createdAt: r.createdAt
    }));

    return res.json({ success: true, data: notifications });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Mark All as Read
router.patch('/mark-all-read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;

    await prisma.notificationRecipient.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() }
    });

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
