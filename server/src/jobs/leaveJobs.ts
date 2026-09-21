import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Monthly Leave Accrual Job (Runs on 1st of every month)
 * Credits annualQuota / 12 to PL, CL, SL balances for all active employees.
 */
export async function runMonthlyLeaveAccrual(): Promise<{
  success: boolean;
  creditedUsers: number;
  totalTransactions: number;
  timestamp: string;
}> {
  const currentYear = new Date().getFullYear();
  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long' });

  // 1. Fetch active employees
  const activeEmployees = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true }
  });

  // 2. Fetch standard accrual leave types
  const leaveTypes = await prisma.leaveType.findMany({
    where: {
      code: { in: ['PL', 'CL', 'SL'] },
      annualQuota: { gt: 0 }
    }
  });

  let creditedUsers = 0;
  let totalTransactions = 0;

  for (const emp of activeEmployees) {
    let userCredited = false;

    for (const lt of leaveTypes) {
      const monthlyCredit = Number((lt.annualQuota / 12).toFixed(2));
      if (monthlyCredit <= 0) continue;

      // Find or create current year balance
      const existingBalance = await prisma.leaveBalance.findUnique({
        where: {
          userId_leaveTypeId_year: {
            userId: emp.id,
            leaveTypeId: lt.id,
            year: currentYear
          }
        }
      });

      let currentAllocated = existingBalance ? existingBalance.totalAllocated : 0;
      let used = existingBalance ? existingBalance.used : 0;
      let pending = existingBalance ? existingBalance.pendingApproval : 0;
      let carried = existingBalance ? existingBalance.carriedForward : 0;

      const balanceBefore = currentAllocated - (used + pending);
      const newAllocated = Number((currentAllocated + monthlyCredit).toFixed(2));
      const balanceAfter = Number((balanceBefore + monthlyCredit).toFixed(2));

      await prisma.$transaction([
        prisma.leaveBalance.upsert({
          where: {
            userId_leaveTypeId_year: {
              userId: emp.id,
              leaveTypeId: lt.id,
              year: currentYear
            }
          },
          update: {
            totalAllocated: newAllocated
          },
          create: {
            userId: emp.id,
            leaveTypeId: lt.id,
            year: currentYear,
            totalAllocated: monthlyCredit,
            used: 0,
            pendingApproval: 0,
            carriedForward: 0
          }
        }),
        prisma.leaveBalanceHistory.create({
          data: {
            userId: emp.id,
            leaveTypeId: lt.id,
            transactionType: 'MONTHLY_ACCRUAL',
            amount: monthlyCredit,
            balanceBefore,
            balanceAfter,
            remarks: `Monthly automated leave credit for ${currentMonthName} ${currentYear} (${lt.code})`
          }
        })
      ]);

      totalTransactions++;
      userCredited = true;
    }

    if (userCredited) creditedUsers++;
  }

  return {
    success: true,
    creditedUsers,
    totalTransactions,
    timestamp: new Date().toISOString()
  };
}

/**
 * Year-End Reset & Carry Forward Job (Runs on Jan 1)
 * Carries forward unused PL up to policy cap, resets CL and SL unused quotas.
 */
export async function runYearEndCarryForward(): Promise<{
  success: boolean;
  usersProcessed: number;
  totalCarriedForwardDays: number;
  timestamp: string;
}> {
  const prevYear = new Date().getFullYear() - 1;
  const newYear = new Date().getFullYear();

  const activeEmployees = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true }
  });

  const plType = await prisma.leaveType.findFirst({
    where: { code: 'PL' }
  });

  let usersProcessed = 0;
  let totalCarriedForwardDays = 0;

  if (plType) {
    const maxCarry = plType.carryForwardMax || 6;

    for (const emp of activeEmployees) {
      const prevBalance = await prisma.leaveBalance.findUnique({
        where: {
          userId_leaveTypeId_year: {
            userId: emp.id,
            leaveTypeId: plType.id,
            year: prevYear
          }
        }
      });

      if (!prevBalance) continue;

      const unused = Math.max(0, prevBalance.totalAllocated - prevBalance.used);
      const toCarry = Math.min(unused, maxCarry);

      if (toCarry > 0) {
        // Upsert into new year balance
        const newBalance = await prisma.leaveBalance.findUnique({
          where: {
            userId_leaveTypeId_year: {
              userId: emp.id,
              leaveTypeId: plType.id,
              year: newYear
            }
          }
        });

        const currentAllocated = newBalance ? newBalance.totalAllocated : 0;
        const currentCarried = newBalance ? newBalance.carriedForward : 0;
        const balanceBefore = currentAllocated - (newBalance?.used || 0);
        const newAllocated = currentAllocated + toCarry;
        const balanceAfter = balanceBefore + toCarry;

        await prisma.$transaction([
          prisma.leaveBalance.upsert({
            where: {
              userId_leaveTypeId_year: {
                userId: emp.id,
                leaveTypeId: plType.id,
                year: newYear
              }
            },
            update: {
              carriedForward: currentCarried + toCarry,
              totalAllocated: newAllocated
            },
            create: {
              userId: emp.id,
              leaveTypeId: plType.id,
              year: newYear,
              totalAllocated: toCarry,
              carriedForward: toCarry,
              used: 0,
              pendingApproval: 0
            }
          }),
          prisma.leaveBalanceHistory.create({
            data: {
              userId: emp.id,
              leaveTypeId: plType.id,
              transactionType: 'YEAR_END_CARRY_FORWARD',
              amount: toCarry,
              balanceBefore,
              balanceAfter,
              remarks: `Carried forward ${toCarry} unused PL days from ${prevYear} into ${newYear}`
            }
          })
        ]);

        totalCarriedForwardDays += toCarry;
        usersProcessed++;
      }
    }
  }

  return {
    success: true,
    usersProcessed,
    totalCarriedForwardDays,
    timestamp: new Date().toISOString()
  };
}

/**
 * Record a Leave Debit when a leave application is approved.
 */
export async function recordLeaveDebit(
  userId: string,
  leaveTypeId: string,
  days: number,
  remarks: string
): Promise<void> {
  const currentYear = new Date().getFullYear();
  const balance = await prisma.leaveBalance.findUnique({
    where: {
      userId_leaveTypeId_year: {
        userId,
        leaveTypeId,
        year: currentYear
      }
    }
  });

  if (!balance) return;

  const available = balance.totalAllocated - (balance.used + balance.pendingApproval);
  const balanceBefore = available + days; // before this debit
  const balanceAfter = available;

  await prisma.leaveBalanceHistory.create({
    data: {
      userId,
      leaveTypeId,
      transactionType: 'LEAVE_DEBIT',
      amount: -days,
      balanceBefore,
      balanceAfter,
      remarks
    }
  });
}

/**
 * Record a Compensatory Off Credit for weekend or holiday working.
 */
export async function creditCompOff(
  userId: string,
  days: number,
  remarks: string
): Promise<boolean> {
  const currentYear = new Date().getFullYear();

  // Find or create COMP_OFF leave type
  let compOffType = await prisma.leaveType.findFirst({
    where: { code: 'COMP_OFF' }
  });

  if (!compOffType) {
    compOffType = await prisma.leaveType.create({
      data: {
        name: 'Compensatory Off (COMP_OFF)',
        code: 'COMP_OFF',
        annualQuota: 0,
        isPaid: true,
        carryForwardMax: 12
      }
    });
  }

  const existingBalance = await prisma.leaveBalance.findUnique({
    where: {
      userId_leaveTypeId_year: {
        userId,
        leaveTypeId: compOffType.id,
        year: currentYear
      }
    }
  });

  const currentAllocated = existingBalance ? existingBalance.totalAllocated : 0;
  const balanceBefore = existingBalance ? currentAllocated - (existingBalance.used + existingBalance.pendingApproval) : 0;
  const newAllocated = currentAllocated + days;
  const balanceAfter = balanceBefore + days;

  await prisma.$transaction([
    prisma.leaveBalance.upsert({
      where: {
        userId_leaveTypeId_year: {
          userId,
          leaveTypeId: compOffType.id,
          year: currentYear
        }
      },
      update: {
        totalAllocated: newAllocated
      },
      create: {
        userId,
        leaveTypeId: compOffType.id,
        year: currentYear,
        totalAllocated: days,
        used: 0,
        pendingApproval: 0,
        carriedForward: 0
      }
    }),
    prisma.leaveBalanceHistory.create({
      data: {
        userId,
        leaveTypeId: compOffType.id,
        transactionType: 'COMP_OFF_CREDIT',
        amount: days,
        balanceBefore,
        balanceAfter,
        remarks
      }
    })
  ]);

  return true;
}
