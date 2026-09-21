import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate, requireRoles } from '../../middleware/auth';
import { eventBus, DomainEvents } from '../../events/eventBus';

const prisma = new PrismaClient();
const router = Router();

// 1. Get All Active Broadcasts
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const broadcasts = await prisma.announcement.findMany({
      where: { isPublished: true },
      include: {
        sender: {
          select: { firstName: true, lastName: true, designation: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: broadcasts });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Publish New Broadcast (Admin Only)
router.post('/', authenticate, requireRoles('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.user?.id!;
    const { title, content, priority, targetType } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        senderId,
        title,
        content,
        priority: priority || 'NORMAL',
        targetType: targetType || 'ALL'
      },
      include: {
        sender: { select: { firstName: true, lastName: true } }
      }
    });

    // Create In-App Notification Records
    const notification = await prisma.notification.create({
      data: {
        eventType: 'HR_BROADCAST',
        title: priority === 'URGENT' ? '🚨 Urgent HR Notice' : '📢 Official Company Notice',
        body: title
      }
    });

    const allUsers = await prisma.user.findMany({ select: { id: true } });
    await prisma.notificationRecipient.createMany({
      data: allUsers.map(u => ({
        notificationId: notification.id,
        userId: u.id,
        isRead: u.id === senderId
      }))
    });

    // EDA Event Dispatch
    eventBus.emit(DomainEvents.BROADCAST_PUBLISHED, {
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      author: `${announcement.sender.firstName} ${announcement.sender.lastName}`,
      time: 'Just now'
    });

    return res.status(201).json({
      success: true,
      message: 'Announcement published and broadcasted successfully.',
      data: announcement
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
