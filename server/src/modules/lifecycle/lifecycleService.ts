import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const STANDARD_ONBOARDING_TASKS = [
  {
    title: 'Workstation & IT Hardware Provisioning',
    description: 'Issue assigned company laptop, monitor, peripherals, and configure OS developer/office environment.',
    category: 'IT'
  },
  {
    title: 'Enterprise Credentials & Security Setup',
    description: 'Provision official company email, Slack/Teams workspace, and configure 2FA / VPN credentials.',
    category: 'SECURITY'
  },
  {
    title: 'Compliance Documents & Signed NDA Verification',
    description: 'Collect signed Non-Disclosure Agreement (NDA), government identity proofs (PAN/Aadhaar), and education/experience records.',
    category: 'DOCUMENTATION'
  },
  {
    title: 'HR Induction & Policy Handbook Briefing',
    description: 'Conduct orientation session on company policies, shift timings, leave quotas, and code of conduct.',
    category: 'HR'
  },
  {
    title: 'Reporting Manager Intro & Onboarding Buddy Allocation',
    description: 'Schedule team introduction meeting and assign an onboarding mentor/buddy for the first 30 days.',
    category: 'GENERAL'
  }
];

export const STANDARD_OFFBOARDING_TASKS = [
  {
    title: 'IT Hardware & Company Asset Return',
    description: 'Recover company-issued laptop, chargers, access badge/keycards, and external peripherals.',
    category: 'ASSET_RETURN'
  },
  {
    title: 'Digital Access & SSO Token Revocation',
    description: 'Revoke VPN credentials, official email access, cloud accounts, and OAuth active sessions.',
    category: 'ACCESS_REVOCATION'
  },
  {
    title: 'Knowledge Transfer (KT) & Task Handover',
    description: 'Verify handover of all active Kanban deliverables, documentation repositories, and client communications.',
    category: 'HANDOVER'
  },
  {
    title: 'HR Exit Interview & Questionnaire',
    description: 'Conduct confidential exit interview to gather feedback, reason for separation, and organizational insights.',
    category: 'EXIT_INTERVIEW'
  },
  {
    title: 'Full & Final (FnF) Settlement & Leave Encashment',
    description: 'Audit unavailed privilege leaves for encashment, clear pending expenses, and finalize last paycheck.',
    category: 'FNF'
  }
];

export class LifecycleService {
  /**
   * Initialize standard onboarding checklist for an employee
   */
  static async initializeOnboarding(userId: string) {
    const existingCount = await prisma.onboardingTask.count({ where: { userId } });
    if (existingCount > 0) return;

    for (const task of STANDARD_ONBOARDING_TASKS) {
      await prisma.onboardingTask.create({
        data: {
          userId,
          title: task.title,
          description: task.description,
          category: task.category,
          isCompleted: false
        }
      });
    }
  }

  /**
   * Get onboarding progress summary for all relevant staff
   */
  static async getOnboardingList(page: number = 1, limit: number = 25, search: string = '') {
    const skip = (page - 1) * limit;

    const whereClause: any = {
      status: { in: ['INVITED', 'ACTIVE', 'PROBATION'] }
    };

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { employeeCode: { contains: search } },
        { email: { contains: search } },
        { designation: { contains: search } }
      ];
    }

    const [totalEntries, users] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.findMany({
        where: whereClause,
        include: {
          department: true,
          onboardingTasks: true
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    // Ensure users have onboarding tasks initialized
    const enriched = await Promise.all(
      users.map(async u => {
        let tasks = u.onboardingTasks;
        if (tasks.length === 0) {
          await this.initializeOnboarding(u.id);
          tasks = await prisma.onboardingTask.findMany({ where: { userId: u.id } });
        }

        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(t => t.isCompleted).length;
        const percentComplete = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          userId: u.id,
          name: `${u.firstName} ${u.lastName}`.trim(),
          employeeCode: u.employeeCode,
          email: u.email,
          designation: u.designation,
          department: u.department?.name || 'General',
          status: u.status,
          joiningDate: u.joiningDate || u.createdAt.toISOString().split('T')[0],
          totalTasks,
          completedTasks,
          percentComplete,
          tasks
        };
      })
    );

    return {
      employees: enriched,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalEntries,
        totalPages: Math.ceil(totalEntries / limit) || 1
      }
    };
  }

  /**
   * Toggle task completion state
   */
  static async toggleOnboardingTask(taskId: string, adminUserId?: string) {
    const task = await prisma.onboardingTask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('Onboarding task not found.');

    const newCompleted = !task.isCompleted;
    return prisma.onboardingTask.update({
      where: { id: taskId },
      data: {
        isCompleted: newCompleted,
        completedAt: newCompleted ? new Date() : null,
        completedById: newCompleted ? adminUserId : null
      }
    });
  }

  /**
   * Initiate Offboarding for an employee
   */
  static async initiateOffboarding(userId: string, data: {
    resignationDate?: string;
    lastWorkingDate: string;
    exitType?: string;
    reason?: string;
    feedback?: string;
    fnfAmount?: number;
  }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('Employee not found.');

    const exitRecord = await prisma.exitRecord.upsert({
      where: { userId },
      update: {
        resignationDate: data.resignationDate,
        lastWorkingDate: data.lastWorkingDate,
        exitType: data.exitType || 'RESIGNATION',
        reason: data.reason,
        feedback: data.feedback,
        fnfAmount: data.fnfAmount
      },
      create: {
        userId,
        resignationDate: data.resignationDate,
        lastWorkingDate: data.lastWorkingDate,
        exitType: data.exitType || 'RESIGNATION',
        reason: data.reason,
        feedback: data.feedback,
        fnfAmount: data.fnfAmount,
        fnfStatus: 'PENDING'
      }
    });

    // Update employee status to RESIGNED (or EXITED/TERMINATED)
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: data.exitType === 'TERMINATION' ? 'TERMINATED' : 'RESIGNED'
      }
    });

    // Populate offboarding tasks if not exists
    const existingTasks = await prisma.offboardingTask.count({ where: { userId } });
    if (existingTasks === 0) {
      for (const t of STANDARD_OFFBOARDING_TASKS) {
        await prisma.offboardingTask.create({
          data: {
            userId,
            title: t.title,
            description: t.description,
            category: t.category,
            isCompleted: false
          }
        });
      }
    }

    return exitRecord;
  }

  /**
   * Get all offboarding cases
   */
  static async getOffboardingList(page: number = 1, limit: number = 25) {
    const skip = (page - 1) * limit;

    const [totalEntries, records] = await Promise.all([
      prisma.exitRecord.count(),
      prisma.exitRecord.findMany({
        include: {
          user: {
            include: {
              department: true,
              offboardingTasks: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    const formatted = records.map(r => {
      const tasks = r.user.offboardingTasks || [];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.isCompleted).length;
      const percentComplete = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        id: r.id,
        userId: r.userId,
        name: `${r.user.firstName} ${r.user.lastName}`.trim(),
        employeeCode: r.user.employeeCode,
        email: r.user.email,
        designation: r.user.designation,
        department: r.user.department?.name || 'General',
        resignationDate: r.resignationDate,
        lastWorkingDate: r.lastWorkingDate,
        exitType: r.exitType,
        reason: r.reason,
        feedback: r.feedback,
        fnfStatus: r.fnfStatus,
        fnfAmount: r.fnfAmount,
        relievingLetterIssued: r.relievingLetterIssued,
        relievingLetterIssuedAt: r.relievingLetterIssuedAt,
        totalTasks,
        completedTasks,
        percentComplete,
        tasks
      };
    });

    return {
      records: formatted,
      pagination: {
        currentPage: page,
        pageSize: limit,
        totalEntries,
        totalPages: Math.ceil(totalEntries / limit) || 1
      }
    };
  }

  /**
   * Toggle offboarding task completion
   */
  static async toggleOffboardingTask(taskId: string, adminUserId?: string) {
    const task = await prisma.offboardingTask.findUnique({ where: { id: taskId } });
    if (!task) throw new Error('Offboarding task not found.');

    const newCompleted = !task.isCompleted;
    return prisma.offboardingTask.update({
      where: { id: taskId },
      data: {
        isCompleted: newCompleted,
        completedAt: newCompleted ? new Date() : null,
        completedById: newCompleted ? adminUserId : null
      }
    });
  }

  /**
   * Compile Relieving & Experience Letter certificate data
   */
  static async getRelievingLetterData(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        exitRecord: true
      }
    });

    if (!user) throw new Error('Employee not found.');
    if (!user.exitRecord) throw new Error('No exit record found for this employee.');

    // Mark as issued
    await prisma.exitRecord.update({
      where: { userId },
      data: {
        relievingLetterIssued: true,
        relievingLetterIssuedAt: new Date()
      }
    });

    return {
      employee: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        employeeCode: user.employeeCode,
        email: user.email,
        designation: user.designation,
        department: user.department?.name || 'General',
        joiningDate: user.joiningDate || user.createdAt.toISOString().split('T')[0]
      },
      exit: {
        resignationDate: user.exitRecord.resignationDate,
        lastWorkingDate: user.exitRecord.lastWorkingDate,
        exitType: user.exitRecord.exitType,
        reason: user.exitRecord.reason,
        issuedDate: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        })
      }
    };
  }
}
