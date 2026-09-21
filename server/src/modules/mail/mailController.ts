import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { InternalMailService } from '../../services/internalMailService';

const prisma = new PrismaClient();
const router = Router();

// -------------------------------------------------------------
// 1. Get Unread Count (Lightweight for badges)
// -------------------------------------------------------------
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const count = await prisma.internalEmailRecipient.count({
      where: {
        userId,
        isRead: false,
        isTrash: false
      }
    });

    return res.json({ success: true, data: { unreadCount: count } });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 2. Company Directory for Recipient Autocomplete
// -------------------------------------------------------------
router.get('/directory', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { search = '' } = req.query;
    const queryStr = (search as string).toLowerCase().trim();

    const users = await prisma.user.findMany({
      where: {
        status: { in: ['ACTIVE', 'PROBATION', 'INVITED'] },
        ...(queryStr
          ? {
              OR: [
                { firstName: { contains: queryStr } },
                { lastName: { contains: queryStr } },
                { officialEmail: { contains: queryStr } },
                { email: { contains: queryStr } },
                { designation: { contains: queryStr } }
              ]
            }
          : {})
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        officialEmail: true,
        email: true,
        role: true,
        designation: true,
        avatarUrl: true,
        department: {
          select: { name: true, code: true }
        }
      },
      take: 30,
      orderBy: { firstName: 'asc' }
    });

    return res.json({ success: true, data: users });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 3. Inbox Emails
// -------------------------------------------------------------
router.get('/inbox', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { category, search, unread, page = '1', limit = '25' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 25));
    const skip = (pageNum - 1) * take;

    const whereRecipient: any = {
      userId,
      isTrash: false
    };

    if (unread === 'true') {
      whereRecipient.isRead = false;
    }

    const emailWhere: any = {};
    if (category && category !== 'ALL') {
      emailWhere.category = category;
    }

    if (search) {
      const q = (search as string).toLowerCase().trim();
      emailWhere.OR = [
        { subject: { contains: q } },
        { body: { contains: q } },
        { sender: { firstName: { contains: q } } },
        { sender: { lastName: { contains: q } } },
        { sender: { officialEmail: { contains: q } } }
      ];
    }

    if (Object.keys(emailWhere).length > 0) {
      whereRecipient.email = emailWhere;
    }

    const [total, recipients] = await prisma.$transaction([
      prisma.internalEmailRecipient.count({ where: whereRecipient }),
      prisma.internalEmailRecipient.findMany({
        where: whereRecipient,
        skip,
        take,
        include: {
          email: {
            include: {
              sender: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  officialEmail: true,
                  role: true,
                  designation: true,
                  avatarUrl: true
                }
              },
              recipients: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                      officialEmail: true
                    }
                  }
                }
              },
              attachments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const formatted = recipients.map(r => ({
      id: r.email.id,
      recipientRecordId: r.id,
      threadId: r.email.threadId,
      subject: r.email.subject,
      snippet: r.email.body.replace(/<[^>]*>?/gm, '').slice(0, 140),
      body: r.email.body,
      category: r.email.category,
      isSystemEmail: r.email.isSystemEmail,
      sender: r.email.sender,
      recipients: r.email.recipients,
      recipientType: r.recipientType,
      isRead: r.isRead,
      readAt: r.readAt,
      isStarred: r.isStarred,
      attachments: r.email.attachments,
      createdAt: r.email.createdAt
    }));

    return res.json({
      success: true,
      data: formatted,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 4. Sent Emails
// -------------------------------------------------------------
router.get('/sent', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { search, page = '1', limit = '25' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 25));
    const skip = (pageNum - 1) * take;

    const where: any = {
      senderId: userId,
      isDraft: false,
      isSenderTrash: false
    };

    if (search) {
      const q = (search as string).toLowerCase().trim();
      where.OR = [
        { subject: { contains: q } },
        { body: { contains: q } }
      ];
    }

    const [total, emails] = await prisma.$transaction([
      prisma.internalEmail.count({ where }),
      prisma.internalEmail.findMany({
        where,
        skip,
        take,
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              officialEmail: true,
              role: true,
              designation: true,
              avatarUrl: true
            }
          },
          recipients: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  officialEmail: true
                }
              }
            }
          },
          attachments: true
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const formatted = emails.map(e => ({
      id: e.id,
      threadId: e.threadId,
      subject: e.subject,
      snippet: e.body.replace(/<[^>]*>?/gm, '').slice(0, 140),
      body: e.body,
      category: e.category,
      isSystemEmail: e.isSystemEmail,
      sender: e.sender,
      recipients: e.recipients,
      isStarred: e.isSenderStarred,
      attachments: e.attachments,
      createdAt: e.createdAt
    }));

    return res.json({
      success: true,
      data: formatted,
      pagination: {
        total,
        page: pageNum,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 5. Starred Emails
// -------------------------------------------------------------
router.get('/starred', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Received starred
    const starredReceived = await prisma.internalEmailRecipient.findMany({
      where: {
        userId,
        isStarred: true,
        isTrash: false
      },
      include: {
        email: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                officialEmail: true,
                role: true,
                designation: true,
                avatarUrl: true
              }
            },
            recipients: {
              include: {
                user: {
                  select: { id: true, firstName: true, lastName: true, officialEmail: true }
                }
              }
            },
            attachments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Sent starred
    const starredSent = await prisma.internalEmail.findMany({
      where: {
        senderId: userId,
        isSenderStarred: true,
        isSenderTrash: false
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officialEmail: true,
            role: true,
            designation: true,
            avatarUrl: true
          }
        },
        recipients: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, officialEmail: true }
            }
          }
        },
        attachments: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const combined = [
      ...starredReceived.map(r => ({
        id: r.email.id,
        recipientRecordId: r.id,
        threadId: r.email.threadId,
        subject: r.email.subject,
        snippet: r.email.body.replace(/<[^>]*>?/gm, '').slice(0, 140),
        body: r.email.body,
        category: r.email.category,
        isSystemEmail: r.email.isSystemEmail,
        sender: r.email.sender,
        recipients: r.email.recipients,
        isRead: r.isRead,
        isStarred: true,
        attachments: r.email.attachments,
        createdAt: r.email.createdAt,
        type: 'RECEIVED'
      })),
      ...starredSent.map(e => ({
        id: e.id,
        threadId: e.threadId,
        subject: e.subject,
        snippet: e.body.replace(/<[^>]*>?/gm, '').slice(0, 140),
        body: e.body,
        category: e.category,
        isSystemEmail: e.isSystemEmail,
        sender: e.sender,
        recipients: e.recipients,
        isRead: true,
        isStarred: true,
        attachments: e.attachments,
        createdAt: e.createdAt,
        type: 'SENT'
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({ success: true, data: combined });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 6. Drafts
// -------------------------------------------------------------
router.get('/drafts', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const drafts = await prisma.internalEmail.findMany({
      where: {
        senderId: userId,
        isDraft: true,
        isSenderTrash: false
      },
      include: {
        recipients: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, officialEmail: true }
            }
          }
        },
        attachments: true
      },
      orderBy: { updatedAt: 'desc' }
    });

    return res.json({ success: true, data: drafts });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 7. Trash Folder
// -------------------------------------------------------------
router.get('/trash', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const trashedReceived = await prisma.internalEmailRecipient.findMany({
      where: {
        userId,
        isTrash: true
      },
      include: {
        email: {
          include: {
            sender: {
              select: { id: true, firstName: true, lastName: true, officialEmail: true, role: true }
            }
          }
        }
      },
      orderBy: { trashedAt: 'desc' }
    });

    const trashedSent = await prisma.internalEmail.findMany({
      where: {
        senderId: userId,
        isSenderTrash: true
      },
      include: {
        recipients: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, officialEmail: true } }
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    const combined = [
      ...trashedReceived.map(r => ({
        id: r.email.id,
        recipientRecordId: r.id,
        subject: r.email.subject,
        snippet: r.email.body.replace(/<[^>]*>?/gm, '').slice(0, 140),
        sender: r.email.sender,
        createdAt: r.email.createdAt,
        type: 'RECEIVED'
      })),
      ...trashedSent.map(e => ({
        id: e.id,
        subject: e.subject,
        snippet: e.body.replace(/<[^>]*>?/gm, '').slice(0, 140),
        recipients: e.recipients,
        createdAt: e.createdAt,
        type: 'SENT'
      }))
    ];

    return res.json({ success: true, data: combined });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 8. Get Single Email by ID & Mark Read
// -------------------------------------------------------------
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const email = await prisma.internalEmail.findUnique({
      where: { id },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            officialEmail: true,
            email: true,
            role: true,
            designation: true,
            avatarUrl: true
          }
        },
        recipients: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                officialEmail: true,
                role: true,
                designation: true,
                avatarUrl: true
              }
            }
          }
        },
        attachments: true
      }
    });

    if (!email) {
      return res.status(404).json({ success: false, message: 'Email not found' });
    }

    // Auto mark read if current user is a recipient
    const recipientRec = await prisma.internalEmailRecipient.findFirst({
      where: { emailId: id, userId }
    });

    if (recipientRec && !recipientRec.isRead) {
      await prisma.internalEmailRecipient.update({
        where: { id: recipientRec.id },
        data: { isRead: true, readAt: new Date() }
      });
    }

    return res.json({
      success: true,
      data: {
        ...email,
        isRead: recipientRec ? recipientRec.isRead : true,
        isStarred: recipientRec ? recipientRec.isStarred : email.isSenderStarred
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 9. Send New Email
// -------------------------------------------------------------
router.post('/send', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const {
      toUserIds,
      ccUserIds = [],
      bccUserIds = [],
      subject,
      body,
      category = 'GENERAL',
      threadId,
      attachments = []
    } = req.body;

    if (!toUserIds || !Array.isArray(toUserIds) || toUserIds.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one recipient is required' });
    }

    if (!subject || subject.trim() === '') {
      return res.status(400).json({ success: false, message: 'Subject is required' });
    }

    const email = await InternalMailService.sendEmail({
      senderId: userId,
      toUserIds,
      ccUserIds,
      bccUserIds,
      subject,
      body: body || '',
      category,
      threadId,
      attachments
    });

    return res.status(201).json({
      success: true,
      message: 'Email dispatched successfully',
      data: email
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 10. Save / Update Draft
// -------------------------------------------------------------
router.post('/draft', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { draftId, subject = '', body = '', toUserIds = [] } = req.body;

    if (draftId) {
      const updated = await prisma.internalEmail.update({
        where: { id: draftId, senderId: userId },
        data: {
          subject: subject.trim(),
          body,
          updatedAt: new Date()
        }
      });
      return res.json({ success: true, message: 'Draft updated', data: updated });
    }

    const draft = await prisma.internalEmail.create({
      data: {
        senderId: userId,
        subject: subject.trim(),
        body,
        isDraft: true
      }
    });

    return res.status(201).json({ success: true, message: 'Draft saved', data: draft });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 11. Toggle Star
// -------------------------------------------------------------
router.patch('/:id/star', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Check if recipient
    const recipientRec = await prisma.internalEmailRecipient.findFirst({
      where: { emailId: id, userId }
    });

    if (recipientRec) {
      const updated = await prisma.internalEmailRecipient.update({
        where: { id: recipientRec.id },
        data: { isStarred: !recipientRec.isStarred }
      });
      return res.json({ success: true, isStarred: updated.isStarred });
    }

    // Check if sender
    const sentEmail = await prisma.internalEmail.findFirst({
      where: { id, senderId: userId }
    });

    if (sentEmail) {
      const updated = await prisma.internalEmail.update({
        where: { id },
        data: { isSenderStarred: !sentEmail.isSenderStarred }
      });
      return res.json({ success: true, isStarred: updated.isSenderStarred });
    }

    return res.status(404).json({ success: false, message: 'Email not found' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 12. Toggle Trash
// -------------------------------------------------------------
router.patch('/:id/trash', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Check if recipient
    const recipientRec = await prisma.internalEmailRecipient.findFirst({
      where: { emailId: id, userId }
    });

    if (recipientRec) {
      const nextTrashState = !recipientRec.isTrash;
      await prisma.internalEmailRecipient.update({
        where: { id: recipientRec.id },
        data: {
          isTrash: nextTrashState,
          trashedAt: nextTrashState ? new Date() : null
        }
      });
      return res.json({
        success: true,
        message: nextTrashState ? 'Moved to trash' : 'Restored from trash'
      });
    }

    // Check if sender
    const sentEmail = await prisma.internalEmail.findFirst({
      where: { id, senderId: userId }
    });

    if (sentEmail) {
      const nextTrashState = !sentEmail.isSenderTrash;
      await prisma.internalEmail.update({
        where: { id },
        data: { isSenderTrash: nextTrashState }
      });
      return res.json({
        success: true,
        message: nextTrashState ? 'Moved to trash' : 'Restored from trash'
      });
    }

    return res.status(404).json({ success: false, message: 'Email not found' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 13. Mark as Read / Unread
// -------------------------------------------------------------
router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { isRead = true } = req.body;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const recipientRec = await prisma.internalEmailRecipient.findFirst({
      where: { emailId: id, userId }
    });

    if (!recipientRec) {
      return res.status(404).json({ success: false, message: 'Email recipient record not found' });
    }

    await prisma.internalEmailRecipient.update({
      where: { id: recipientRec.id },
      data: {
        isRead: Boolean(isRead),
        readAt: isRead ? new Date() : null
      }
    });

    return res.json({ success: true, isRead: Boolean(isRead) });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 14. Permanent Delete
// -------------------------------------------------------------
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const recipientRec = await prisma.internalEmailRecipient.findFirst({
      where: { emailId: id, userId, isTrash: true }
    });

    if (recipientRec) {
      await prisma.internalEmailRecipient.delete({
        where: { id: recipientRec.id }
      });
      return res.json({ success: true, message: 'Email permanently deleted' });
    }

    const sentEmail = await prisma.internalEmail.findFirst({
      where: { id, senderId: userId, isSenderTrash: true }
    });

    if (sentEmail) {
      await prisma.internalEmail.delete({
        where: { id }
      });
      return res.json({ success: true, message: 'Email permanently deleted' });
    }

    return res.status(404).json({
      success: false,
      message: 'Email not found in trash to delete permanently'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
