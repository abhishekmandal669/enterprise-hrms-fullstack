import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PayrollCalculationItem {
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    email: string;
    designation: string;
    department: string;
    avatarUrl?: string | null;
  };
  salaryStructure: {
    monthlyGross: number;
    basic: number;
    hra: number;
    da: number;
    specialAllowance: number;
    pfEmployee: number;
    esi: number;
    professionalTax: number;
    tds: number;
    currency: string;
  };
  totalMonthDays: number;
  workingDays: number;
  presentDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  overtimeHours: number;
  overtimePay: number;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  breakdown: {
    earnings: {
      basic: number;
      hra: number;
      da: number;
      specialAllowance: number;
      overtimePay: number;
    };
    deductions: {
      pfEmployee: number;
      esi: number;
      professionalTax: number;
      tds: number;
      lopDeduction: number;
    };
  };
}

export class PayrollService {
  /**
   * Helper: Calculate working days in a month (excluding weekends and official holidays)
   */
  static async getWorkingDaysInMonth(year: number, month: number): Promise<{ totalDays: number; workingDays: number; holidays: any[] }> {
    const totalDays = new Date(year, month, 0).getDate();
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(totalDays).padStart(2, '0')}`;

    const holidays = await prisma.holiday.findMany({
      where: {
        date: {
          gte: startDateStr,
          lte: endDateStr
        }
      }
    });
    const holidayDates = new Set(holidays.map(h => h.date));

    let workingDays = 0;
    for (let d = 1; d <= totalDays; d++) {
      const currentDate = new Date(year, month - 1, d);
      const dayOfWeek = currentDate.getDay(); // 0 = Sun, 6 = Sat
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      // Typical Monday-Friday standard shift
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayDates.has(dateStr)) {
        workingDays++;
      }
    }

    return { totalDays, workingDays: workingDays || 22, holidays };
  }

  /**
   * Compute monthly payroll for all active staff for a specific month & year
   */
  static async computePayrollForMonth(year: number, month: number, adminUserId: string) {
    const { totalDays, workingDays } = await this.getWorkingDaysInMonth(year, month);
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(totalDays).padStart(2, '0')}`;

    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      include: {
        department: true,
        salaryStructure: true
      },
      orderBy: { firstName: 'asc' }
    });

    const entries: PayrollCalculationItem[] = [];

    for (const u of users) {
      // Default structure if not set
      const struct = u.salaryStructure || {
        monthlyGross: 50000,
        basic: 25000,
        hra: 10000,
        da: 5000,
        specialAllowance: 10000,
        pfEmployee: 1800,
        esi: 0,
        professionalTax: 200,
        tds: 2500,
        currency: 'INR'
      };

      // 1. Attendance Metrics
      const attendances = await prisma.attendance.findMany({
        where: {
          userId: u.id,
          attendanceDate: {
            gte: startDateStr,
            lte: endDateStr
          }
        }
      });

      let presentDays = 0;
      let totalOvertimeMinutes = 0;
      attendances.forEach(att => {
        if (att.status === 'PRESENT' || att.status === 'LATE') {
          presentDays += 1;
        } else if (att.status === 'HALF_DAY') {
          presentDays += 0.5;
        }
        totalOvertimeMinutes += (att.overtimeMinutes || 0);
      });

      const overtimeHours = Number((totalOvertimeMinutes / 60).toFixed(1));

      // 2. Approved Leaves
      const leaves = await prisma.leaveRequest.findMany({
        where: {
          userId: u.id,
          status: 'APPROVED',
          fromDate: { lte: endDateStr },
          toDate: { gte: startDateStr }
        },
        include: {
          leaveType: true
        }
      });

      let paidLeaveDays = 0;
      let explicitUnpaidDays = 0;
      leaves.forEach(l => {
        if (!l.leaveType.isPaid || l.leaveType.code === 'UNPAID') {
          explicitUnpaidDays += l.durationDays;
        } else {
          paidLeaveDays += l.durationDays;
        }
      });

      // Calculate unpaid/LOP days
      // If employee has fewer present + paid leave days than total working days, remaining are unexcused/LOP
      // (Defaulting to actual worked + approved leaves, or minimum 0)
      const accountedDays = presentDays + paidLeaveDays;
      const unexcusedDays = Math.max(0, workingDays - accountedDays);
      const unpaidLeaveDays = explicitUnpaidDays > 0 ? explicitUnpaidDays : Math.min(unexcusedDays, workingDays);

      // 3. Compensation Calculation
      const monthlyGross = struct.monthlyGross;
      const lopDeduction = Number(((monthlyGross / totalDays) * unpaidLeaveDays).toFixed(2));

      // Hourly OT calculation: (Monthly Gross / (workingDays * 8)) * OT hours
      const hourlyRate = (monthlyGross / (workingDays * 8));
      const overtimePay = Number((hourlyRate * overtimeHours).toFixed(2));

      const grossEarnings = Number((monthlyGross + overtimePay).toFixed(2));
      const pfEmployee = struct.pfEmployee;
      const esi = struct.esi;
      const professionalTax = struct.professionalTax;
      const tds = struct.tds;

      const totalDeductions = Number((pfEmployee + esi + professionalTax + tds + lopDeduction).toFixed(2));
      const netPay = Math.max(0, Number((grossEarnings - totalDeductions).toFixed(2)));

      entries.push({
        userId: u.id,
        user: {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          employeeCode: u.employeeCode,
          email: u.email,
          designation: u.designation,
          department: u.department?.name || 'General',
          avatarUrl: u.avatarUrl
        },
        salaryStructure: {
          monthlyGross: struct.monthlyGross,
          basic: struct.basic,
          hra: struct.hra,
          da: struct.da,
          specialAllowance: struct.specialAllowance,
          pfEmployee: struct.pfEmployee,
          esi: struct.esi,
          professionalTax: struct.professionalTax,
          tds: struct.tds,
          currency: struct.currency || 'INR'
        },
        totalMonthDays: totalDays,
        workingDays,
        presentDays,
        paidLeaveDays,
        unpaidLeaveDays,
        overtimeHours,
        overtimePay,
        grossEarnings,
        totalDeductions,
        netPay,
        breakdown: {
          earnings: {
            basic: struct.basic,
            hra: struct.hra,
            da: struct.da,
            specialAllowance: struct.specialAllowance,
            overtimePay
          },
          deductions: {
            pfEmployee,
            esi,
            professionalTax,
            tds,
            lopDeduction
          }
        }
      });
    }

    return {
      month,
      year,
      totalEmployees: entries.length,
      workingDays,
      totalMonthDays: totalDays,
      entries
    };
  }

  /**
   * Create or update draft payroll run in the database
   */
  static async generateDraftPayrollRun(year: number, month: number, adminUserId: string) {
    const computed = await this.computePayrollForMonth(year, month, adminUserId);

    let totalGrossPay = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;

    computed.entries.forEach(e => {
      totalGrossPay += e.grossEarnings;
      totalDeductions += e.totalDeductions;
      totalNetPay += e.netPay;
    });

    // Check if payroll run already exists
    let run = await prisma.payrollRun.findUnique({
      where: {
        month_year: { month, year }
      },
      include: { entries: true }
    });

    if (run && run.status === 'FINALIZED') {
      throw new Error(`Payroll for ${month}/${year} is already FINALIZED and cannot be modified.`);
    }

    if (!run) {
      run = await prisma.payrollRun.create({
        data: {
          month,
          year,
          status: 'DRAFT',
          totalEmployees: computed.totalEmployees,
          totalGrossPay: Number(totalGrossPay.toFixed(2)),
          totalDeductions: Number(totalDeductions.toFixed(2)),
          totalNetPay: Number(totalNetPay.toFixed(2)),
          processedById: adminUserId
        },
        include: { entries: true }
      });
    } else {
      run = await prisma.payrollRun.update({
        where: { id: run.id },
        data: {
          totalEmployees: computed.totalEmployees,
          totalGrossPay: Number(totalGrossPay.toFixed(2)),
          totalDeductions: Number(totalDeductions.toFixed(2)),
          totalNetPay: Number(totalNetPay.toFixed(2)),
          processedById: adminUserId
        },
        include: { entries: true }
      });
    }

    // Upsert entries
    for (const item of computed.entries) {
      await prisma.payrollEntry.upsert({
        where: {
          payrollRunId_userId: {
            payrollRunId: run.id,
            userId: item.userId
          }
        },
        update: {
          grossEarnings: item.grossEarnings,
          totalDeductions: item.totalDeductions,
          netPay: item.netPay,
          totalMonthDays: item.totalMonthDays,
          workingDays: item.workingDays,
          presentDays: item.presentDays,
          paidLeaveDays: item.paidLeaveDays,
          unpaidLeaveDays: item.unpaidLeaveDays,
          overtimeHours: item.overtimeHours,
          overtimePay: item.overtimePay,
          breakdown: JSON.stringify(item.breakdown)
        },
        create: {
          payrollRunId: run.id,
          userId: item.userId,
          grossEarnings: item.grossEarnings,
          totalDeductions: item.totalDeductions,
          netPay: item.netPay,
          totalMonthDays: item.totalMonthDays,
          workingDays: item.workingDays,
          presentDays: item.presentDays,
          paidLeaveDays: item.paidLeaveDays,
          unpaidLeaveDays: item.unpaidLeaveDays,
          overtimeHours: item.overtimeHours,
          overtimePay: item.overtimePay,
          breakdown: JSON.stringify(item.breakdown),
          status: 'GENERATED'
        }
      });
    }

    return this.getPayrollRunById(run.id);
  }

  /**
   * Finalize a payroll run and mark entries as PAID / FINALIZED
   */
  static async finalizePayrollRun(runId: string, adminUserId: string) {
    const run = await prisma.payrollRun.findUnique({
      where: { id: runId },
      include: { entries: true }
    });

    if (!run) throw new Error('Payroll run not found.');
    if (run.status === 'FINALIZED') throw new Error('Payroll run is already finalized.');

    const updated = await prisma.payrollRun.update({
      where: { id: runId },
      data: {
        status: 'FINALIZED',
        finalizedAt: new Date()
      },
      include: {
        entries: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employeeCode: true,
                designation: true,
                department: { select: { name: true } }
              }
            }
          }
        },
        processedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return updated;
  }

  /**
   * Get full details of a specific payroll run
   */
  static async getPayrollRunById(runId: string) {
    return prisma.payrollRun.findUnique({
      where: { id: runId },
      include: {
        processedBy: {
          select: { firstName: true, lastName: true, email: true }
        },
        entries: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                employeeCode: true,
                designation: true,
                avatarUrl: true,
                department: { select: { name: true } }
              }
            }
          },
          orderBy: {
            user: { firstName: 'asc' }
          }
        }
      }
    });
  }
}
