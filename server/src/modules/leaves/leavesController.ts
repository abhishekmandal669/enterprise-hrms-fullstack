import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { eventBus, DomainEvents } from '../../events/eventBus';
import { runMonthlyLeaveAccrual, runYearEndCarryForward } from '../../jobs/leaveJobs';

const prisma = new PrismaClient();
const router = Router();

// 1. Get Leave Balances for Current User
router.get('/balances', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const year = new Date().getFullYear();

    const balances = await prisma.leaveBalance.findMany({
      where: { userId, year },
      include: { leaveType: true }
    });

    return res.json({ success: true, data: balances });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Apply for Leave
router.post('/apply', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { leaveTypeCode, fromDate, toDate, isHalfDay, halfDaySlot, reason, attachmentUrl } = req.body;

    if (!leaveTypeCode || !fromDate || !toDate || !reason) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    const leaveType = await prisma.leaveType.findFirst({
      where: { code: leaveTypeCode }
    });

    if (!leaveType) {
      return res.status(404).json({ success: false, message: 'Invalid leave type.' });
    }

    const year = new Date(fromDate).getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        userId_leaveTypeId_year: {
          userId,
          leaveTypeId: leaveType.id,
          year
        }
      }
    });

    if (!balance) {
      return res.status(400).json({ success: false, message: 'No allocated balance found for this year.' });
    }

    // Calculate Days
    let durationDays = isHalfDay ? 0.5 : Math.ceil((new Date(toDate).getTime() - new Date(fromDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (isNaN(durationDays) || durationDays <= 0) durationDays = 1;

    const available = balance.totalAllocated - (balance.used + balance.pendingApproval);
    if (durationDays > available) {
      return res.status(400).json({
        success: false,
        message: `Insufficient leave balance. You only have ${available} days available.`
      });
    }

    // Transaction: Create Leave Request & Update Pending Balance (TDA Atomic)
    const [newRequest] = await prisma.$transaction([
      prisma.leaveRequest.create({
        data: {
          userId,
          leaveTypeId: leaveType.id,
          fromDate,
          toDate,
          durationDays,
          isHalfDay: !!isHalfDay,
          halfDaySlot: isHalfDay ? halfDaySlot : null,
          reason,
          attachmentUrl: attachmentUrl || null,
          status: 'PENDING'
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              designation: true,
              reportingManagerId: true
            }
          },
          leaveType: true
        }
      }),
      prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { pendingApproval: { increment: durationDays } }
      })
    ]);

    // EDA Event Dispatch
    eventBus.emit(DomainEvents.LEAVE_APPLIED, {
      requestId: newRequest.id,
      applicantId: userId,
      applicantName: `${newRequest.user.firstName} ${newRequest.user.lastName}`,
      managerId: newRequest.user.reportingManagerId,
      leaveType: newRequest.leaveType.name,
      fromDate,
      toDate,
      duration: `${durationDays} Days`
    });

    return res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully.',
      data: newRequest
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Get Leave Requests (Scoped by Role)
router.get('/requests', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    const userId = req.user?.id!;

    let whereClause: any = {};
    if (role === 'EMPLOYEE') {
      whereClause = { userId };
    } else if (role === 'MANAGER') {
      // Also fetch any delegators who delegated to this user for today
      const today = new Date().toISOString().split('T')[0];
      const activeDelegations = await prisma.delegationRequest.findMany({
        where: {
          delegateeId: userId,
          status: 'ACTIVE',
          startDate: { lte: today },
          endDate: { gte: today }
        },
        select: { delegatorId: true }
      });
      const delegatorIds = activeDelegations.map(d => d.delegatorId);

      whereClause = {
        OR: [
          { userId },
          { user: { reportingManagerId: userId } },
          ...(delegatorIds.length > 0 ? [{ user: { reportingManagerId: { in: delegatorIds } } }] : [])
        ]
      };
    }

    const requests = await prisma.leaveRequest.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } },
        leaveType: true,
        approvedBy: { select: { firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: requests });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Unified Leave Status Update / Approve / Reject (Manager or Admin)
const handleLeaveDecision = async (
  req: AuthRequest,
  res: Response,
  id: string,
  targetStatus: 'APPROVED' | 'REJECTED',
  rejectionReason?: string
) => {
  try {
    const approverId = req.user?.id!;
    const userRole = req.user?.role;

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            reportingManagerId: true
          }
        },
        leaveType: true
      }
    });

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    // Role & Hierarchy Authorization
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN'].includes(userRole || '');
    const isDirectManager = userRole === 'MANAGER' && leave.user.reportingManagerId === approverId;

    // Check Approval Delegation: Has the reporting manager delegated authority to approverId?
    const today = new Date().toISOString().split('T')[0];
    let isActingDelegate = false;
    if (leave.user.reportingManagerId) {
      const activeDelegation = await prisma.delegationRequest.findFirst({
        where: {
          delegatorId: leave.user.reportingManagerId,
          delegateeId: approverId,
          status: 'ACTIVE',
          startDate: { lte: today },
          endDate: { gte: today }
        }
      });
      if (activeDelegation) {
        isActingDelegate = true;
      }
    }

    if (!isAdmin && !isDirectManager && !isActingDelegate) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to review this leave request.'
      });
    }

    if (leave.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Request is already ${leave.status}.` });
    }

    const year = new Date(leave.fromDate).getFullYear();
    let balance = await prisma.leaveBalance.findUnique({
      where: {
        userId_leaveTypeId_year: {
          userId: leave.userId,
          leaveTypeId: leave.leaveTypeId,
          year
        }
      }
    });

    // If balance record does not exist for this year, create it safely
    if (!balance) {
      balance = await prisma.leaveBalance.create({
        data: {
          userId: leave.userId,
          leaveTypeId: leave.leaveTypeId,
          year,
          totalAllocated: leave.leaveType?.annualQuota || 12,
          used: 0,
          pendingApproval: 0
        }
      });
    }

    const pendingToDecrement = Math.min(balance.pendingApproval || 0, leave.durationDays);

    if (targetStatus === 'APPROVED') {
      const [updated] = await prisma.$transaction([
        prisma.leaveRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedById: approverId
          }
        }),
        prisma.leaveBalance.update({
          where: { id: balance.id },
          data: {
            pendingApproval: { decrement: pendingToDecrement },
            used: { increment: leave.durationDays }
          }
        }),
        prisma.leaveBalanceHistory.create({
          data: {
            userId: leave.userId,
            leaveTypeId: leave.leaveTypeId,
            transactionType: 'LEAVE_DEBIT',
            amount: -leave.durationDays,
            balanceBefore: balance.totalAllocated - balance.used,
            balanceAfter: balance.totalAllocated - (balance.used + leave.durationDays),
            remarks: `Approved leave application from ${leave.fromDate} to ${leave.toDate} (${leave.durationDays} days)`
          }
        })
      ]);

      eventBus.emit(DomainEvents.LEAVE_APPROVED, {
        requestId: id,
        applicantId: leave.userId,
        applicantName: `${leave.user.firstName} ${leave.user.lastName}`,
        fromDate: leave.fromDate,
        duration: `${leave.durationDays} Days`
      });

      return res.json({
        success: true,
        message: 'Leave approved successfully.',
        data: updated
      });
    } else {
      const [updated] = await prisma.$transaction([
        prisma.leaveRequest.update({
          where: { id },
          data: {
            status: 'REJECTED',
            approvedById: approverId,
            rejectionReason: rejectionReason || 'Declined by manager'
          }
        }),
        prisma.leaveBalance.update({
          where: { id: balance.id },
          data: {
            pendingApproval: { decrement: pendingToDecrement }
          }
        })
      ]);

      eventBus.emit(DomainEvents.LEAVE_REJECTED, {
        requestId: id,
        applicantId: leave.userId,
        fromDate: leave.fromDate
      });

      return res.json({
        success: true,
        message: 'Leave rejected successfully.',
        data: updated
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Route: Status patch (handles both /:id/status and /requests/:id/status)
router.patch(['/:id/status', '/requests/:id/status'], authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status, rejectionReason, reason } = req.body;

  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(422).json({ success: false, message: 'Status must be APPROVED or REJECTED.' });
  }

  return handleLeaveDecision(req, res, id, status, rejectionReason || reason);
});

// Route: Approve alias
router.patch(['/:id/approve', '/requests/:id/approve'], authenticate, async (req: AuthRequest, res: Response) => {
  return handleLeaveDecision(req, res, req.params.id, 'APPROVED');
});

// Route: Reject alias
router.patch(['/:id/reject', '/requests/:id/reject'], authenticate, async (req: AuthRequest, res: Response) => {
  return handleLeaveDecision(req, res, req.params.id, 'REJECTED', req.body.reason || req.body.rejectionReason);
});

// 6. Cancel Leave Request (Applicant self-service)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id!;
    const userRole = req.user?.role;

    const leave = await prisma.leaveRequest.findUnique({
      where: { id }
    });

    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    if (leave.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Only pending leave requests can be cancelled.' });
    }

    if (leave.userId !== userId && !['ADMIN', 'SUPER_ADMIN'].includes(userRole || '')) {
      return res.status(403).json({ success: false, message: 'You can only cancel your own pending leave requests.' });
    }

    const year = new Date(leave.fromDate).getFullYear();
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        userId_leaveTypeId_year: {
          userId: leave.userId,
          leaveTypeId: leave.leaveTypeId,
          year
        }
      }
    });

    await prisma.$transaction([
      prisma.leaveRequest.delete({
        where: { id }
      }),
      ...(balance ? [
        prisma.leaveBalance.update({
          where: { id: balance.id },
          data: {
            pendingApproval: { decrement: leave.durationDays }
          }
        })
      ] : [])
    ]);

    return res.json({
      success: true,
      message: 'Leave request cancelled and quota balance restored.'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 7. Get Leave Balance History Ledger (Self or Admin)
router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = (req.query.userId as string) && ['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN'].includes(req.user?.role || '')
      ? String(req.query.userId)
      : req.user?.id!;

    const history = await prisma.leaveBalanceHistory.findMany({
      where: { userId },
      include: {
        leaveType: { select: { id: true, name: true, code: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return res.json({ success: true, data: history });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 8. Admin Manual Trigger: Monthly Leave Accrual
router.post('/admin/trigger-accrual', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (!['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN'].includes(role || '')) {
      return res.status(403).json({ success: false, message: 'Forbidden: HR Admin or Admin required.' });
    }

    const result = await runMonthlyLeaveAccrual();
    return res.json({
      success: true,
      message: `Monthly leave accrual processed for ${result.creditedUsers} users (${result.totalTransactions} transactions).`,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 9. Admin Manual Trigger: Year-End Carry Forward
router.post('/admin/trigger-carry-forward', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (!['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN'].includes(role || '')) {
      return res.status(403).json({ success: false, message: 'Forbidden: HR Admin or Admin required.' });
    }

    const result = await runYearEndCarryForward();
    return res.json({
      success: true,
      message: `Year-end carry forward processed for ${result.usersProcessed} users (${result.totalCarriedForwardDays} PL days carried forward).`,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 10. Get Delegations (My Given Delegations + Incoming Delegations)
router.get('/delegations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const [given, received] = await Promise.all([
      prisma.delegationRequest.findMany({
        where: { delegatorId: userId },
        include: {
          delegatee: {
            select: { id: true, firstName: true, lastName: true, designation: true, avatarUrl: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.delegationRequest.findMany({
        where: { delegateeId: userId },
        include: {
          delegator: {
            select: { id: true, firstName: true, lastName: true, designation: true, avatarUrl: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return res.json({
      success: true,
      data: {
        given,
        received
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 11. Create New Approval Delegation
router.post('/delegations', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const delegatorId = req.user!.id;
    const { delegateeId, startDate, endDate, reason } = req.body;

    if (!delegateeId) {
      return res.status(400).json({ success: false, message: 'Delegatee user is required.' });
    }
    if (delegateeId === delegatorId) {
      return res.status(400).json({ success: false, message: 'Cannot delegate approvals to yourself.' });
    }
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Start date and end date are required.' });
    }
    if (startDate > endDate) {
      return res.status(400).json({ success: false, message: 'Start date cannot be after end date.' });
    }

    const delegation = await prisma.delegationRequest.create({
      data: {
        delegatorId,
        delegateeId,
        startDate,
        endDate,
        reason: reason?.trim() || null,
        status: 'ACTIVE'
      },
      include: {
        delegatee: {
          select: { id: true, firstName: true, lastName: true, designation: true }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Approval authority delegated successfully.',
      data: delegation
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 12. Revoke Delegation
router.put('/delegations/:id/revoke', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const delegation = await prisma.delegationRequest.findUnique({ where: { id } });
    if (!delegation) {
      return res.status(404).json({ success: false, message: 'Delegation record not found.' });
    }

    // Only delegator or Admin can revoke
    if (delegation.delegatorId !== userId && !['ADMIN', 'SUPER_ADMIN'].includes(req.user!.role)) {
      return res.status(403).json({ success: false, message: 'You cannot revoke this delegation.' });
    }

    const updated = await prisma.delegationRequest.update({
      where: { id },
      data: { status: 'REVOKED' }
    });

    return res.json({
      success: true,
      message: 'Delegation authority revoked successfully.',
      data: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 13. Get Eligible Delegate Colleagues
router.get('/delegations/eligible-users', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        status: 'ACTIVE'
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        designation: true,
        role: true,
        department: { select: { name: true } }
      },
      orderBy: { firstName: 'asc' }
    });

    return res.json({ success: true, data: users });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
