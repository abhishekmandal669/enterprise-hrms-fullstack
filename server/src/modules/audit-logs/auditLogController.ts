import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate, requireRoles } from '../../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// 1. Get Audit Logs List (Admin Only)
router.get('/', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { action, actorId, limit = 50, page = 1 } = req.query;

    const take = Math.min(100, Number(limit) || 50);
    const skip = (Math.max(1, Number(page)) - 1) * take;

    const where: any = {};
    if (action) where.action = { contains: String(action) };
    if (actorId) where.actorId = String(actorId);

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip
      }),
      prisma.auditLog.count({ where })
    ]);

    return res.json({
      success: true,
      data: {
        logs,
        pagination: {
          total,
          page: Number(page) || 1,
          limit: take,
          totalPages: Math.ceil(total / take)
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
