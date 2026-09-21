import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate, requireRoles } from '../../middleware/auth';
import { DEFAULT_OFFICE_GEOFENCE, GeofenceRule } from '../../core/utils/geofence';

const prisma = new PrismaClient();
const router = Router();

// In-memory or persisted geofence state
let currentGeofence: GeofenceRule & { isEnforced: boolean } = {
  ...DEFAULT_OFFICE_GEOFENCE,
  isEnforced: false // default false for flexible dev/testing
};

// -------------------------------------------------------------
// SHIFT MANAGEMENT (CRUD)
// -------------------------------------------------------------

// 1. Get All Shifts
router.get('/shifts', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const shifts = await prisma.shift.findMany({
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: shifts });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Create Shift (Admin / HR Admin)
router.post('/shifts', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, startTime, endTime, graceMinutes, breakMinutes, weekOffs, isActive } = req.body;

    if (!name || !code) {
      return res.status(422).json({ success: false, message: 'Shift name and unique code are required.' });
    }

    const shift = await prisma.shift.create({
      data: {
        name: String(name).trim(),
        code: String(code).trim().toUpperCase(),
        startTime: startTime || '09:00',
        endTime: endTime || '18:00',
        graceMinutes: graceMinutes !== undefined ? Number(graceMinutes) : 15,
        breakMinutes: breakMinutes !== undefined ? Number(breakMinutes) : 60,
        weekOffs: typeof weekOffs === 'string' ? weekOffs : JSON.stringify(weekOffs || [0, 6]),
        isActive: isActive !== undefined ? !!isActive : true
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Work shift created successfully.',
      data: shift
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Update Shift
router.put('/shifts/:id', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, startTime, endTime, graceMinutes, breakMinutes, weekOffs, isActive } = req.body;

    const existing = await prisma.shift.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Shift not found.' });
    }

    const updated = await prisma.shift.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : existing.name,
        code: code !== undefined ? String(code).trim().toUpperCase() : existing.code,
        startTime: startTime !== undefined ? startTime : existing.startTime,
        endTime: endTime !== undefined ? endTime : existing.endTime,
        graceMinutes: graceMinutes !== undefined ? Number(graceMinutes) : existing.graceMinutes,
        breakMinutes: breakMinutes !== undefined ? Number(breakMinutes) : existing.breakMinutes,
        weekOffs: weekOffs !== undefined ? (typeof weekOffs === 'string' ? weekOffs : JSON.stringify(weekOffs)) : existing.weekOffs,
        isActive: isActive !== undefined ? !!isActive : existing.isActive
      }
    });

    return res.json({
      success: true,
      message: 'Shift configuration updated.',
      data: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Delete Shift
router.delete('/shifts/:id', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.shift.delete({ where: { id } });
    return res.json({ success: true, message: 'Shift deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// GEOFENCE & IP RULES CONFIGURATION
// -------------------------------------------------------------

// 5. Get Current Geofence Configuration
router.get('/geofence', authenticate, (_req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    data: currentGeofence
  });
});

// 6. Update Geofence Configuration (Admin Only)
router.put('/geofence', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), (req: AuthRequest, res: Response) => {
  const { officeLatitude, officeLongitude, allowedRadiusMeters, isEnforced } = req.body;

  if (officeLatitude !== undefined) currentGeofence.officeLatitude = Number(officeLatitude);
  if (officeLongitude !== undefined) currentGeofence.officeLongitude = Number(officeLongitude);
  if (allowedRadiusMeters !== undefined) currentGeofence.allowedRadiusMeters = Number(allowedRadiusMeters);
  if (isEnforced !== undefined) currentGeofence.isEnforced = !!isEnforced;

  return res.json({
    success: true,
    message: 'Corporate geofence perimeter updated.',
    data: currentGeofence
  });
});

// -------------------------------------------------------------
// LEAVE POLICIES CONFIGURATION
// -------------------------------------------------------------

// 7. Get All Leave Policies
router.get('/leave-policies', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const policies = await prisma.leaveType.findMany({
      orderBy: { code: 'asc' }
    });
    return res.json({ success: true, data: policies });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 8. Update Leave Policy (Admin Only)
router.put('/leave-policies/:id', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { annualQuota, carryForwardMax, isPaid, requiresDocAfter } = req.body;

    const existing = await prisma.leaveType.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Leave policy not found.' });
    }

    const updated = await prisma.leaveType.update({
      where: { id },
      data: {
        annualQuota: annualQuota !== undefined ? Number(annualQuota) : existing.annualQuota,
        carryForwardMax: carryForwardMax !== undefined ? Number(carryForwardMax) : existing.carryForwardMax,
        isPaid: isPaid !== undefined ? !!isPaid : existing.isPaid,
        requiresDocAfter: requiresDocAfter !== undefined ? Number(requiresDocAfter) : existing.requiresDocAfter
      }
    });

    return res.json({
      success: true,
      message: 'Leave quota and policy updated successfully.',
      data: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export { currentGeofence };
export default router;
