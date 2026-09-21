import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class RecruitmentService {
  // 1. Job Openings
  static async getJobOpenings(options: {
    page?: number;
    limit?: number;
    status?: string;
    departmentId?: string;
    search?: string;
  }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.status) where.status = options.status;
    if (options.departmentId) where.departmentId = options.departmentId;
    if (options.search) {
      where.OR = [
        { title: { contains: options.search } },
        { location: { contains: options.search } }
      ];
    }

    const [total, jobs] = await Promise.all([
      prisma.jobOpening.count({ where }),
      prisma.jobOpening.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          department: true,
          postedBy: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true }
          },
          _count: {
            select: { applications: true }
          }
        }
      })
    ]);

    return {
      jobs: jobs.map(j => ({
        ...j,
        applicationsCount: j._count.applications
      })),
      pagination: {
        page,
        limit,
        totalEntries: total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async createJobOpening(data: {
    title: string;
    departmentId?: string;
    location?: string;
    jobType?: string;
    experienceLevel?: string;
    openPositions?: number;
    description: string;
    requirements?: string;
    salaryMin?: number;
    salaryMax?: number;
    deadline?: string;
    postedById?: string;
  }) {
    return prisma.jobOpening.create({
      data: {
        title: data.title,
        departmentId: data.departmentId || null,
        location: data.location || 'Headquarters / Hybrid',
        jobType: data.jobType || 'FULL_TIME',
        experienceLevel: data.experienceLevel || 'MID_LEVEL',
        openPositions: Number(data.openPositions) || 1,
        description: data.description,
        requirements: data.requirements || null,
        salaryMin: data.salaryMin ? Number(data.salaryMin) : null,
        salaryMax: data.salaryMax ? Number(data.salaryMax) : null,
        status: 'OPEN',
        deadline: data.deadline || null,
        postedById: data.postedById || null
      },
      include: { department: true }
    });
  }

  static async updateJobStatus(jobId: string, status: string) {
    return prisma.jobOpening.update({
      where: { id: jobId },
      data: { status }
    });
  }

  // 2. Candidate Pipeline
  static async getCandidatePipeline(options: {
    jobId?: string;
    stage?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.jobId) where.jobId = options.jobId;
    if (options.stage) where.stage = options.stage;
    if (options.search) {
      where.candidate = {
        OR: [
          { fullName: { contains: options.search } },
          { email: { contains: options.search } },
          { currentCompany: { contains: options.search } }
        ]
      };
    }

    const [total, applications] = await Promise.all([
      prisma.jobApplication.count({ where }),
      prisma.jobApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { appliedAt: 'desc' },
        include: {
          candidate: true,
          job: {
            include: { department: true }
          },
          interviews: {
            include: {
              interviewer: {
                select: { id: true, firstName: true, lastName: true, employeeCode: true }
              }
            }
          },
          offerLetter: true
        }
      })
    ]);

    // Stage metrics
    const stageCounts = await prisma.jobApplication.groupBy({
      by: ['stage'],
      _count: { id: true },
      where: options.jobId ? { jobId: options.jobId } : undefined
    });

    const metrics = {
      APPLIED: 0,
      SCREENING: 0,
      INTERVIEW: 0,
      OFFER: 0,
      JOINED: 0,
      REJECTED: 0
    };
    stageCounts.forEach(s => {
      if (s.stage in metrics) {
        metrics[s.stage as keyof typeof metrics] = s._count.id;
      }
    });

    return {
      applications,
      metrics,
      pagination: {
        page,
        limit,
        totalEntries: total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async submitCandidate(data: {
    jobId: string;
    fullName: string;
    email: string;
    phone?: string;
    currentCompany?: string;
    currentCtc?: number;
    expectedCtc?: number;
    noticePeriodDays?: number;
    resumeUrl?: string;
    source?: string;
    notes?: string;
  }) {
    const candidate = await prisma.candidate.upsert({
      where: { email: data.email },
      update: {
        fullName: data.fullName,
        phone: data.phone || undefined,
        currentCompany: data.currentCompany || undefined,
        currentCtc: data.currentCtc ? Number(data.currentCtc) : undefined,
        expectedCtc: data.expectedCtc ? Number(data.expectedCtc) : undefined,
        noticePeriodDays: data.noticePeriodDays ? Number(data.noticePeriodDays) : undefined,
        resumeUrl: data.resumeUrl || undefined
      },
      create: {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone || null,
        currentCompany: data.currentCompany || null,
        currentCtc: data.currentCtc ? Number(data.currentCtc) : null,
        expectedCtc: data.expectedCtc ? Number(data.expectedCtc) : null,
        noticePeriodDays: data.noticePeriodDays ? Number(data.noticePeriodDays) : 30,
        resumeUrl: data.resumeUrl || null,
        source: data.source || 'DIRECT'
      }
    });

    return prisma.jobApplication.create({
      data: {
        jobId: data.jobId,
        candidateId: candidate.id,
        stage: 'APPLIED',
        status: 'ACTIVE',
        notes: data.notes || null
      },
      include: {
        candidate: true,
        job: true
      }
    });
  }

  static async updateApplicationStage(applicationId: string, stage: string, rejectionReason?: string) {
    return prisma.jobApplication.update({
      where: { id: applicationId },
      data: {
        stage,
        status: stage === 'REJECTED' ? 'REJECTED' : stage === 'JOINED' ? 'HIRED' : 'ACTIVE',
        rejectionReason: rejectionReason || null
      },
      include: { candidate: true, job: true }
    });
  }

  // 3. Interview Scheduling
  static async scheduleInterview(data: {
    applicationId: string;
    interviewerId?: string;
    interviewType: string;
    scheduledAt: string;
    durationMinutes?: number;
    meetingLink?: string;
  }) {
    const interview = await prisma.interview.create({
      data: {
        applicationId: data.applicationId,
        interviewerId: data.interviewerId || null,
        interviewType: data.interviewType || 'TECHNICAL',
        scheduledAt: new Date(data.scheduledAt),
        durationMinutes: Number(data.durationMinutes) || 45,
        meetingLink: data.meetingLink || 'https://meet.google.com/lex-recruitment'
      },
      include: {
        interviewer: {
          select: { id: true, firstName: true, lastName: true, employeeCode: true }
        }
      }
    });

    // Auto-advance application to INTERVIEW stage if currently in APPLIED/SCREENING
    await prisma.jobApplication.update({
      where: { id: data.applicationId },
      data: { stage: 'INTERVIEW' }
    });

    return interview;
  }

  static async submitInterviewFeedback(interviewId: string, feedbackData: {
    feedback: string;
    rating: number;
    recommendation: string;
  }) {
    return prisma.interview.update({
      where: { id: interviewId },
      data: {
        feedback: feedbackData.feedback,
        rating: Number(feedbackData.rating),
        recommendation: feedbackData.recommendation,
        status: 'COMPLETED'
      }
    });
  }

  // 4. Offer Letter Generation
  static async generateOfferLetter(data: {
    applicationId: string;
    offeredRole: string;
    offeredCtc: number;
    joiningDate: string;
    expiryDate?: string;
    letterContent?: string;
  }) {
    const offer = await prisma.offerLetter.upsert({
      where: { applicationId: data.applicationId },
      update: {
        offeredRole: data.offeredRole,
        offeredCtc: Number(data.offeredCtc),
        joiningDate: data.joiningDate,
        expiryDate: data.expiryDate || null,
        letterContent: data.letterContent || null,
        status: 'SENT'
      },
      create: {
        applicationId: data.applicationId,
        offeredRole: data.offeredRole,
        offeredCtc: Number(data.offeredCtc),
        joiningDate: data.joiningDate,
        expiryDate: data.expiryDate || null,
        letterContent: data.letterContent || null,
        status: 'SENT'
      }
    });

    // Advance application to OFFER stage
    await prisma.jobApplication.update({
      where: { id: data.applicationId },
      data: { stage: 'OFFER' }
    });

    return offer;
  }

  static async getOfferLetterDetails(applicationId: string) {
    const application = await prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: {
        candidate: true,
        job: { include: { department: true } },
        offerLetter: true
      }
    });

    if (!application || !application.offerLetter) {
      throw new Error('Offer letter not found for this candidate');
    }

    const ctc = application.offerLetter.offeredCtc;
    const monthlyGross = Math.round(ctc / 12);
    const basic = Math.round(monthlyGross * 0.5);
    const hra = Math.round(monthlyGross * 0.4);
    const specialAllowance = monthlyGross - (basic + hra);
    const pfEmployee = Math.min(Math.round(basic * 0.12), 1800);

    return {
      company: {
        name: 'Lexvera Technologies Private Limited',
        cin: 'U72200KA2024PTC189201',
        registeredAddress: 'Prestige Tech Park, Outer Ring Road, Marathahalli, Bangalore, Karnataka 560103',
        website: 'https://lexvera.com'
      },
      candidate: application.candidate,
      job: application.job,
      offer: application.offerLetter,
      compensationBreakdown: {
        annualCtc: ctc,
        monthlyGross,
        basic,
        hra,
        specialAllowance,
        pfEmployee,
        estimatedNetMonthly: monthlyGross - pfEmployee - 200
      }
    };
  }
}
