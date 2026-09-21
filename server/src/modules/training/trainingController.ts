import { Router, Response } from 'express';
import { AuthRequest, authenticate, requireRoles } from '../../middleware/auth';
import { TrainingService } from './trainingService';

const router = Router();

// =============================================================
// 1. Training Programs
// =============================================================
router.get('/programs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const status = req.query.status as string;
    const category = req.query.category as string;
    const search = req.query.search as string;

    const data = await TrainingService.getPrograms({
      page,
      limit,
      status,
      category,
      search,
      userId: req.user?.id
    });

    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/programs', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { title, category, trainerName, description, startDate, endDate, maxCapacity } = req.body;

    if (!title || !trainerName || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Title, trainer, and schedule dates are required' });
    }

    const program = await TrainingService.createProgram({
      title,
      category,
      trainerName,
      description,
      startDate,
      endDate,
      maxCapacity
    });

    return res.status(201).json({ success: true, data: program });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/programs/:programId/enroll', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const targetUserId = req.body.userId || req.user?.id;
    const enrollment = await TrainingService.enrollUser(req.params.programId, targetUserId);
    return res.status(201).json({ success: true, data: enrollment });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

router.patch('/enrollments/:enrollmentId', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { status, score, feedback } = req.body;
    const updated = await TrainingService.updateEnrollmentStatus(req.params.enrollmentId, status, score, feedback);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================
// 2. Employee Certifications
// =============================================================
router.get('/certifications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const search = req.query.search as string;
    const expiringSoon = req.query.expiringSoon === 'true';
    const userId = req.query.userId as string || (req.user?.role === 'EMPLOYEE' ? req.user?.id : undefined);

    const data = await TrainingService.getCertifications({
      userId,
      page,
      limit,
      search,
      expiringSoon
    });

    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/certifications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, issuingOrg, issueDate, expiryDate, credentialId, credentialUrl } = req.body;

    if (!name || !issuingOrg || !issueDate) {
      return res.status(400).json({ success: false, message: 'Name, issuing organization, and issue date are required' });
    }

    const cert = await TrainingService.addCertification({
      userId: req.user?.id!,
      name,
      issuingOrg,
      issueDate,
      expiryDate,
      credentialId,
      credentialUrl
    });

    return res.status(201).json({ success: true, data: cert });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/certifications/:certId/verify', authenticate, requireRoles('ADMIN', 'HR_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const cert = await TrainingService.verifyCertification(req.params.certId, req.user?.id!);
    return res.json({ success: true, data: cert });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
