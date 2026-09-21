import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate, requireRoles } from '../../middleware/auth';
import { LifecycleService } from './lifecycleService';

const router = Router();
const prisma = new PrismaClient();

// =============================================================
// 1. Onboarding Pipeline: List New Joiners & Progress
// =============================================================
router.get('/onboarding', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const search = (req.query.search as string) || '';

    const result = await LifecycleService.getOnboardingList(page, limit, search);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================================
// 2. Toggle Onboarding Task Completion
// =============================================================
router.patch('/onboarding/task/:taskId', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const adminUserId = req.user?.id;

    const updated = await LifecycleService.toggleOnboardingTask(taskId, adminUserId);
    return res.json({
      success: true,
      data: updated,
      message: `Task marked as ${updated.isCompleted ? 'COMPLETED' : 'PENDING'}.`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================================
// 3. Initialize / Reset Onboarding Checklist
// =============================================================
router.post('/onboarding/:userId/init', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    await LifecycleService.initializeOnboarding(userId);
    return res.json({ success: true, message: 'Onboarding checklist initialized successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================================
// 4. Offboarding Pipeline: List Exiting Staff & Governance
// =============================================================
router.get('/offboarding', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));

    const result = await LifecycleService.getOffboardingList(page, limit);
    return res.json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================================
// 5. Initiate Offboarding / Resignation
// =============================================================
router.post('/offboarding/:userId/initiate', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const {
      resignationDate = new Date().toISOString().split('T')[0],
      lastWorkingDate,
      exitType = 'RESIGNATION',
      reason,
      feedback,
      fnfAmount
    } = req.body;

    if (!lastWorkingDate) {
      return res.status(400).json({ success: false, message: 'lastWorkingDate is required.' });
    }

    const record = await LifecycleService.initiateOffboarding(userId, {
      resignationDate,
      lastWorkingDate,
      exitType,
      reason,
      feedback,
      fnfAmount: fnfAmount ? Number(fnfAmount) : undefined
    });

    return res.json({
      success: true,
      data: record,
      message: 'Employee offboarding initiated and tasks created successfully.'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================================
// 6. Toggle Offboarding Task Completion
// =============================================================
router.patch('/offboarding/task/:taskId', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;
    const adminUserId = req.user?.id;

    const updated = await LifecycleService.toggleOffboardingTask(taskId, adminUserId);
    return res.json({
      success: true,
      data: updated,
      message: `Offboarding task marked as ${updated.isCompleted ? 'COMPLETED' : 'PENDING'}.`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================================
// 7. Generate & Fetch Digital Relieving Letter
// =============================================================
router.get('/exit/:userId/relieving-letter', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const callerId = req.user?.id!;
    const callerRole = req.user?.role!;

    const isSelf = callerId === userId;
    const isHrOrAdmin = ['ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'].includes(callerRole);

    if (!isSelf && !isHrOrAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this relieving certificate.' });
    }

    const certificate = await LifecycleService.getRelievingLetterData(userId);
    return res.json({ success: true, data: certificate });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================================
// 8. Update FnF Settlement Status
// =============================================================
router.patch('/exit/:userId/fnf', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { fnfStatus, fnfAmount } = req.body;

    const validStatuses = ['PENDING', 'IN_PROGRESS', 'SETTLED'];
    if (fnfStatus && !validStatuses.includes(fnfStatus)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const updated = await prisma.exitRecord.update({
      where: { userId },
      data: {
        ...(fnfStatus ? { fnfStatus } : {}),
        ...(fnfAmount !== undefined ? { fnfAmount: Number(fnfAmount) } : {})
      }
    });

    return res.json({
      success: true,
      data: updated,
      message: 'Full & Final settlement status updated.'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
