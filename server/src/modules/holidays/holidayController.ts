import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate, requireRoles } from '../../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// 1. Get All Holidays
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: 'asc' }
    });
    return res.json({ success: true, data: holidays });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Add New Holiday (Admin Only)
router.post('/', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { date, name, isOptional, description } = req.body;

    if (!date || !name) {
      return res.status(422).json({ success: false, message: 'Holiday date and name are required.' });
    }

    const holiday = await prisma.holiday.create({
      data: {
        date: String(date).trim(),
        name: String(name).trim(),
        isOptional: !!isOptional,
        description: description ? String(description).trim() : null
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Holiday added to corporate calendar.',
      data: holiday
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Delete Holiday (Admin Only)
router.delete('/:id', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.holiday.delete({ where: { id } });
    return res.json({ success: true, message: 'Holiday deleted from calendar.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
