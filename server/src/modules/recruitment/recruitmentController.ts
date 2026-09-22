import { Router, Response } from 'express';
import { AuthRequest, authenticate, requireRoles } from '../../middleware/auth';
import { RecruitmentService } from './recruitmentService';

const router = Router();

// =============================================================
// 1. Job Openings
// =============================================================
router.get('/jobs', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const status = req.query.status as string;
    const departmentId = req.query.departmentId as string;
    const search = req.query.search as string;

    const data = await RecruitmentService.getJobOpenings({
      page,
      limit,
      status,
      departmentId,
      search
    });

    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/jobs', authenticate, requireRoles('ADMIN', 'HR_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      title,
      departmentId,
      location,
      jobType,
      experienceLevel,
      openPositions,
      description,
      requirements,
      salaryMin,
      salaryMax,
      deadline
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Job title and description are required' });
    }

    const job = await RecruitmentService.createJobOpening({
      title,
      departmentId,
      location,
      jobType,
      experienceLevel,
      openPositions,
      description,
      requirements,
      salaryMin,
      salaryMax,
      deadline,
      postedById: req.user?.id
    });

    return res.status(201).json({ success: true, data: job });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/jobs/:jobId/status', authenticate, requireRoles('ADMIN', 'HR_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const job = await RecruitmentService.updateJobStatus(req.params.jobId, status);
    return res.json({ success: true, data: job });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================
// 2. Candidate Applications & Pipeline
// =============================================================
router.get('/pipeline', authenticate, requireRoles('ADMIN', 'HR_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const jobId = req.query.jobId as string;
    const stage = req.query.stage as string;
    const search = req.query.search as string;

    const data = await RecruitmentService.getCandidatePipeline({
      page,
      limit,
      jobId,
      stage,
      search
    });

    return res.json({ success: true, data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/candidates', authenticate, requireRoles('ADMIN', 'HR_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      jobId,
      fullName,
      email,
      phone,
      currentCompany,
      currentCtc,
      expectedCtc,
      noticePeriodDays,
      resumeUrl,
      source,
      notes
    } = req.body;

    if (!jobId || !fullName || !email) {
      return res.status(400).json({ success: false, message: 'Job ID, candidate name, and email are required' });
    }

    const application = await RecruitmentService.submitCandidate({
      jobId,
      fullName,
      email,
      phone,
      currentCompany,
      currentCtc,
      expectedCtc,
      noticePeriodDays,
      resumeUrl,
      source,
      notes
    });

    return res.status(201).json({ success: true, data: application });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/applications/:applicationId/stage', authenticate, requireRoles('ADMIN', 'HR_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { stage, rejectionReason } = req.body;
    const updated = await RecruitmentService.updateApplicationStage(req.params.applicationId, stage, rejectionReason);
    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================
// 3. Interview Scheduling & Feedback
// =============================================================
router.post('/interviews', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      applicationId,
      interviewerId,
      interviewType,
      scheduledAt,
      durationMinutes,
      meetingLink
    } = req.body;

    if (!applicationId || !scheduledAt) {
      return res.status(400).json({ success: false, message: 'Application ID and scheduled date/time are required' });
    }

    const interview = await RecruitmentService.scheduleInterview({
      applicationId,
      interviewerId: interviewerId || req.user?.id,
      interviewType,
      scheduledAt,
      durationMinutes,
      meetingLink
    });

    return res.status(201).json({ success: true, data: interview });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/interviews/:interviewId/feedback', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { feedback, rating, recommendation } = req.body;
    const interview = await RecruitmentService.submitInterviewFeedback(req.params.interviewId, {
      feedback,
      rating,
      recommendation
    });
    return res.json({ success: true, data: interview });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================
// 4. Offer Letter Generation & Print
// =============================================================
router.post('/applications/:applicationId/offer', authenticate, requireRoles('ADMIN', 'HR_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { offeredRole, offeredCtc, joiningDate, expiryDate, letterContent } = req.body;

    if (!offeredRole || !offeredCtc || !joiningDate) {
      return res.status(400).json({ success: false, message: 'Offered role, CTC, and joining date are required' });
    }

    const offer = await RecruitmentService.generateOfferLetter({
      applicationId: req.params.applicationId,
      offeredRole,
      offeredCtc,
      joiningDate,
      expiryDate,
      letterContent
    });

    return res.status(201).json({ success: true, data: offer });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/applications/:applicationId/offer-letter', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const letterDetails = await RecruitmentService.getOfferLetterDetails(req.params.applicationId);
    return res.json({ success: true, data: letterDetails });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
