import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate, requirePermission } from '../../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// -------------------------------------------------------------
// 1. Get All Consolidated Master Dropdowns
// -------------------------------------------------------------
router.get('/dropdowns', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [departments, leaveTypes, shifts, masterData, managers] = await prisma.$transaction([
      prisma.department.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.leaveType.findMany({ orderBy: { name: 'asc' } }),
      prisma.shift.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.masterData.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.user.findMany({
        where: { role: { in: ['MANAGER', 'ADMIN', 'HR_ADMIN'] }, status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true, role: true, designation: true }
      })
    ]);

    const designations = masterData.filter(m => m.category === 'DESIGNATION');
    const workModes = masterData.filter(m => m.category === 'WORK_MODE');

    return res.json({
      success: true,
      data: {
        departments,
        leaveTypes,
        shifts,
        designations: designations.map(d => ({ key: d.key, label: d.label })),
        workModes: workModes.map(w => ({ key: w.key, label: w.label })),
        managers: managers.map(m => ({ id: m.id, name: `${m.firstName} ${m.lastName} (${m.role})` }))
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 2. Get Holiday Calendar
// -------------------------------------------------------------
router.get('/holidays', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: 'asc' }
    });
    return res.json({ success: true, data: holidays });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 3. Add Holiday (Admin)
// -------------------------------------------------------------
router.post('/holidays', authenticate, requirePermission('policy.manage'), async (req: AuthRequest, res: Response) => {
  try {
    const { date, name, description, isOptional = false } = req.body;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!date || !name || !dateRegex.test(String(date).trim())) {
      return res.status(422).json({ success: false, message: 'Valid date in YYYY-MM-DD format and holiday name are required.' });
    }

    const holiday = await prisma.holiday.upsert({
      where: {
        date_name: {
          date: String(date).trim(),
          name: String(name).trim()
        }
      },
      update: {
        description: description ? String(description).trim() : null,
        isOptional: !!isOptional
      },
      create: {
        date: String(date).trim(),
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        isOptional: !!isOptional
      }
    });

    return res.status(201).json({ success: true, message: 'Holiday saved.', data: holiday });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 4. Get Employees List (slim — for selectors in Documents, Assets, etc.)
// -------------------------------------------------------------
router.get('/employees', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const employees = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeCode: true,
        designation: true,
        avatarUrl: true,
        role: true,
        department: { select: { name: true } }
      },
      orderBy: { firstName: 'asc' }
    });

    return res.json({
      success: true,
      data: employees.map(e => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        employeeCode: e.employeeCode,
        designation: e.designation,
        department: e.department?.name || '',
        avatarUrl: e.avatarUrl,
        role: e.role
      }))
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
