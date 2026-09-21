import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TrainingService {
  // 1. Training Programs
  static async getPrograms(options: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    search?: string;
    userId?: string;
  }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.status) where.status = options.status;
    if (options.category) where.category = options.category;
    if (options.search) {
      where.OR = [
        { title: { contains: options.search } },
        { trainerName: { contains: options.search } }
      ];
    }

    const [total, programs] = await Promise.all([
      prisma.trainingProgram.count({ where }),
      prisma.trainingProgram.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: {
          enrollments: {
            include: {
              user: {
                select: { id: true, firstName: true, lastName: true, employeeCode: true, avatarUrl: true }
              }
            }
          },
          _count: {
            select: { enrollments: true }
          }
        }
      })
    ]);

    const enriched = programs.map(p => {
      const isEnrolled = options.userId
        ? p.enrollments.some(e => e.userId === options.userId)
        : false;

      return {
        ...p,
        enrolledCount: p._count.enrollments,
        isEnrolled
      };
    });

    return {
      programs: enriched,
      pagination: {
        page,
        limit,
        totalEntries: total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async createProgram(data: {
    title: string;
    category?: string;
    trainerName: string;
    description?: string;
    startDate: string;
    endDate: string;
    maxCapacity?: number;
  }) {
    return prisma.trainingProgram.create({
      data: {
        title: data.title,
        category: data.category || 'TECHNICAL',
        trainerName: data.trainerName,
        description: data.description || null,
        startDate: data.startDate,
        endDate: data.endDate,
        maxCapacity: Number(data.maxCapacity) || 20,
        status: 'UPCOMING'
      }
    });
  }

  static async enrollUser(programId: string, userId: string) {
    const program = await prisma.trainingProgram.findUnique({
      where: { id: programId },
      include: { _count: { select: { enrollments: true } } }
    });

    if (!program) throw new Error('Training program not found');
    if (program._count.enrollments >= program.maxCapacity) {
      throw new Error('This training program has reached maximum participant capacity');
    }

    return prisma.trainingEnrollment.create({
      data: {
        programId,
        userId,
        status: 'ENROLLED'
      },
      include: { program: true }
    });
  }

  static async updateEnrollmentStatus(enrollmentId: string, status: string, score?: number, feedback?: string) {
    return prisma.trainingEnrollment.update({
      where: { id: enrollmentId },
      data: {
        status,
        score: score !== undefined ? Number(score) : undefined,
        feedback: feedback || undefined,
        completedAt: status === 'COMPLETED' ? new Date() : undefined
      }
    });
  }

  // 2. Employee Certifications
  static async getCertifications(options: {
    userId?: string;
    page?: number;
    limit?: number;
    expiringSoon?: boolean;
    search?: string;
  }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 10);
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.userId) where.userId = options.userId;
    if (options.search) {
      where.OR = [
        { name: { contains: options.search } },
        { issuingOrg: { contains: options.search } },
        { credentialId: { contains: options.search } }
      ];
    }

    const [total, certs] = await Promise.all([
      prisma.certification.count({ where }),
      prisma.certification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true, department: true }
          }
        }
      })
    ]);

    // Calculate expiry urgency for each certification
    const today = new Date();
    const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const enriched = certs.map(c => {
      let isExpired = false;
      let isExpiringSoon = false;

      if (c.expiryDate) {
        const exp = new Date(c.expiryDate);
        if (exp < today) isExpired = true;
        else if (exp <= thirtyDaysAhead) isExpiringSoon = true;
      }

      return {
        ...c,
        isExpired,
        isExpiringSoon
      };
    });

    const finalResults = options.expiringSoon
      ? enriched.filter(c => c.isExpiringSoon || c.isExpired)
      : enriched;

    return {
      certifications: finalResults,
      pagination: {
        page,
        limit,
        totalEntries: total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async addCertification(data: {
    userId: string;
    name: string;
    issuingOrg: string;
    issueDate: string;
    expiryDate?: string;
    credentialId?: string;
    credentialUrl?: string;
  }) {
    return prisma.certification.create({
      data: {
        userId: data.userId,
        name: data.name,
        issuingOrg: data.issuingOrg,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate || null,
        credentialId: data.credentialId || null,
        credentialUrl: data.credentialUrl || null,
        verifiedByHR: false
      }
    });
  }

  static async verifyCertification(certId: string, verifiedById: string) {
    return prisma.certification.update({
      where: { id: certId },
      data: {
        verifiedByHR: true,
        verifiedAt: new Date(),
        verifiedById
      }
    });
  }
}
