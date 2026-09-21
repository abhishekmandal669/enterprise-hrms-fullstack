import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate, requireRoles } from '../../middleware/auth';
import { PayrollService } from './payrollService';

const router = Router();
const prisma = new PrismaClient();

// =============================================================
// 1. Employee Self-Service: My Payslips
// =============================================================
router.get('/my-payslips', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const [totalEntries, entries] = await Promise.all([
      prisma.payrollEntry.count({
        where: {
          userId,
          payrollRun: { status: 'FINALIZED' }
        }
      }),
      prisma.payrollEntry.findMany({
        where: {
          userId,
          payrollRun: { status: 'FINALIZED' }
        },
        include: {
          payrollRun: {
            select: {
              id: true,
              month: true,
              year: true,
              status: true,
              finalizedAt: true
            }
          }
        },
        orderBy: [
          { payrollRun: { year: 'desc' } },
          { payrollRun: { month: 'desc' } }
        ],
        skip,
        take: limit
      })
    ]);

    const formatted = entries.map(e => ({
      id: e.id,
      month: e.payrollRun.month,
      year: e.payrollRun.year,
      grossEarnings: e.grossEarnings,
      totalDeductions: e.totalDeductions,
      netPay: e.netPay,
      workingDays: e.workingDays,
      presentDays: e.presentDays,
      unpaidLeaveDays: e.unpaidLeaveDays,
      overtimeHours: e.overtimeHours,
      overtimePay: e.overtimePay,
      breakdown: typeof e.breakdown === 'string' ? JSON.parse(e.breakdown) : e.breakdown,
      status: e.status,
      finalizedAt: e.payrollRun.finalizedAt
    }));

    return res.json({
      success: true,
      data: {
        entries: formatted,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalEntries,
          totalPages: Math.ceil(totalEntries / limit) || 1
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================================
// 2. Payslip Details (View / Download / Print)
// =============================================================
router.get('/payslip/:entryId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { entryId } = req.params;
    const userId = req.user?.id!;
    const userRole = req.user?.role!;

    const entry = await prisma.payrollEntry.findUnique({
      where: { id: entryId },
      include: {
        payrollRun: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            employeeCode: true,
            designation: true,
            phone: true,
            address: true,
            joiningDate: true,
            department: { select: { name: true, code: true } }
          }
        }
      }
    });

    if (!entry) {
      return res.status(404).json({ success: false, message: 'Payslip entry not found.' });
    }

    // Access control: Employee can only view own payslip unless Admin/HR
    const isOwner = entry.userId === userId;
    const isAdmin = ['ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'].includes(userRole);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this payslip.' });
    }

    const breakdown = typeof entry.breakdown === 'string' ? JSON.parse(entry.breakdown) : entry.breakdown;

    return res.json({
      success: true,
      data: {
        id: entry.id,
        payrollRunId: entry.payrollRunId,
        month: entry.payrollRun.month,
        year: entry.payrollRun.year,
        runStatus: entry.payrollRun.status,
        finalizedAt: entry.payrollRun.finalizedAt,
        employee: {
          id: entry.user.id,
          name: `${entry.user.firstName} ${entry.user.lastName}`.trim(),
          employeeCode: entry.user.employeeCode,
          designation: entry.user.designation,
          department: entry.user.department?.name || 'General',
          email: entry.user.email,
          joiningDate: entry.user.joiningDate,
          phone: entry.user.phone
        },
        metrics: {
          totalMonthDays: entry.totalMonthDays,
          workingDays: entry.workingDays,
          presentDays: entry.presentDays,
          paidLeaveDays: entry.paidLeaveDays,
          unpaidLeaveDays: entry.unpaidLeaveDays,
          overtimeHours: entry.overtimeHours,
          overtimePay: entry.overtimePay
        },
        financials: {
          grossEarnings: entry.grossEarnings,
          totalDeductions: entry.totalDeductions,
          netPay: entry.netPay,
          earnings: breakdown.earnings,
          deductions: breakdown.deductions
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================================
// 3. Salary Structures Master List (Admin & HR Admin)
// =============================================================
router.get('/structures', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || '';

    const whereClause: any = {
      status: 'ACTIVE'
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
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          employeeCode: true,
          role: true,
          designation: true,
          avatarUrl: true,
          department: { select: { name: true } },
          salaryStructure: true
        },
        orderBy: { firstName: 'asc' },
        skip,
        take: limit
      })
    ]);

    const formatted = users.map(u => ({
      userId: u.id,
      name: `${u.firstName} ${u.lastName}`.trim(),
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      employeeCode: u.employeeCode,
      role: u.role,
      designation: u.designation,
      avatarUrl: u.avatarUrl,
      department: u.department?.name || 'General',
      salaryStructure: u.salaryStructure || null
    }));

    return res.json({
      success: true,
      data: {
        employees: formatted,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalEntries,
          totalPages: Math.ceil(totalEntries / limit) || 1
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================================
// 4. Upsert Salary Structure (Admin & HR Admin)
// =============================================================
router.post('/structure/:userId', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const {
      monthlyGross,
      basic,
      hra,
      da = 0,
      specialAllowance = 0,
      pfEmployee = 1800,
      pfEmployer = 1800,
      esi = 0,
      professionalTax = 200,
      tds = 0,
      currency = 'INR'
    } = req.body;

    if (!monthlyGross || !basic) {
      return res.status(400).json({ success: false, message: 'monthlyGross and basic salary are required.' });
    }

    const structure = await prisma.salaryStructure.upsert({
      where: { userId },
      update: {
        monthlyGross: Number(monthlyGross),
        basic: Number(basic),
        hra: Number(hra),
        da: Number(da),
        specialAllowance: Number(specialAllowance),
        pfEmployee: Number(pfEmployee),
        pfEmployer: Number(pfEmployer),
        esi: Number(esi),
        professionalTax: Number(professionalTax),
        tds: Number(tds),
        currency
      },
      create: {
        userId,
        monthlyGross: Number(monthlyGross),
        basic: Number(basic),
        hra: Number(hra),
        da: Number(da),
        specialAllowance: Number(specialAllowance),
        pfEmployee: Number(pfEmployee),
        pfEmployer: Number(pfEmployer),
        esi: Number(esi),
        professionalTax: Number(professionalTax),
        tds: Number(tds),
        currency
      }
    });

    return res.json({
      success: true,
      data: structure,
      message: 'Salary structure updated successfully.'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================================
// 5. List All Payroll Runs (Admin & HR Admin)
// =============================================================
router.get('/runs', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
    const skip = (page - 1) * limit;

    const [totalEntries, runs] = await Promise.all([
      prisma.payrollRun.count(),
      prisma.payrollRun.findMany({
        include: {
          processedBy: {
            select: { firstName: true, lastName: true, email: true }
          },
          _count: {
            select: { entries: true }
          }
        },
        orderBy: [
          { year: 'desc' },
          { month: 'desc' }
        ],
        skip,
        take: limit
      })
    ]);

    return res.json({
      success: true,
      data: {
        runs: runs.map(r => ({
          id: r.id,
          month: r.month,
          year: r.year,
          status: r.status,
          totalEmployees: r.totalEmployees,
          totalGrossPay: r.totalGrossPay,
          totalDeductions: r.totalDeductions,
          totalNetPay: r.totalNetPay,
          processedBy: r.processedBy ? `${r.processedBy.firstName} ${r.processedBy.lastName}`.trim() : 'System',
          finalizedAt: r.finalizedAt,
          createdAt: r.createdAt
        })),
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalEntries,
          totalPages: Math.ceil(totalEntries / limit) || 1
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================================
// 6. Get Specific Payroll Run Details (Admin & HR Admin)
// =============================================================
router.get('/runs/:id', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const run = await PayrollService.getPayrollRunById(id);

    if (!run) {
      return res.status(404).json({ success: false, message: 'Payroll run not found.' });
    }

    const formatted = {
      id: run.id,
      month: run.month,
      year: run.year,
      status: run.status,
      totalEmployees: run.totalEmployees,
      totalGrossPay: run.totalGrossPay,
      totalDeductions: run.totalDeductions,
      totalNetPay: run.totalNetPay,
      finalizedAt: run.finalizedAt,
      processedBy: run.processedBy ? `${run.processedBy.firstName} ${run.processedBy.lastName}`.trim() : 'System',
      entries: run.entries.map(e => ({
        id: e.id,
        userId: e.userId,
        name: `${e.user.firstName} ${e.user.lastName}`.trim(),
        employeeCode: e.user.employeeCode,
        designation: e.user.designation,
        department: e.user.department?.name || 'General',
        avatarUrl: e.user.avatarUrl,
        grossEarnings: e.grossEarnings,
        totalDeductions: e.totalDeductions,
        netPay: e.netPay,
        workingDays: e.workingDays,
        presentDays: e.presentDays,
        unpaidLeaveDays: e.unpaidLeaveDays,
        overtimeHours: e.overtimeHours,
        overtimePay: e.overtimePay,
        breakdown: typeof e.breakdown === 'string' ? JSON.parse(e.breakdown) : e.breakdown,
        status: e.status
      }))
    };

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================================
// 7. Calculate & Generate Draft Payroll Run (Admin & HR Admin)
// =============================================================
router.post('/runs/draft', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const adminUserId = req.user?.id!;
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({ success: false, message: 'month and year are required.' });
    }

    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (m < 1 || m > 12) {
      return res.status(400).json({ success: false, message: 'month must be between 1 and 12.' });
    }

    const run = await PayrollService.generateDraftPayrollRun(y, m, adminUserId);

    return res.json({
      success: true,
      data: run,
      message: `Draft payroll for ${m}/${y} calculated successfully.`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// =============================================================
// 8. Finalize Payroll Run (Admin & HR Admin)
// =============================================================
router.post('/runs/:id/finalize', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user?.id!;

    const finalized = await PayrollService.finalizePayrollRun(id, adminUserId);

    // Create system notification for all employees in this run
    try {
      await prisma.notification.create({
        data: {
          eventType: 'PAYSLIP_FINALIZED',
          title: `Payslip Available (${finalized.month}/${finalized.year})`,
          body: `Your payslip for ${finalized.month}/${finalized.year} has been finalized.`,
          recipients: {
            create: finalized.entries.map(e => ({
              userId: e.userId
            }))
          }
        }
      });
    } catch (notifErr) {
      // Continue even if notification fails
    }

    return res.json({
      success: true,
      data: finalized,
      message: `Payroll run for ${finalized.month}/${finalized.year} has been finalized and payslips are published.`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
