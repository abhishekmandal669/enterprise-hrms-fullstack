import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate, requireRoles } from '../../middleware/auth';
import { eventBus, DomainEvents } from '../../events/eventBus';

const prisma = new PrismaClient();
const router = Router();

// -------------------------------------------------------------
// 1. Submit Daily Work Timesheet
// -------------------------------------------------------------
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const {
      logDate = new Date().toISOString().split('T')[0],
      projectId,
      taskTitle,
      activityDescription,
      totalMinutes = 480,
      productiveMinutes = 420,
      breakMinutes = 0,
      startTime,
      endTime,
      activityType = 'DEVELOPMENT',
      isBillable = true
    } = req.body;

    if (!taskTitle || !activityDescription) {
      return res.status(422).json({
        success: false,
        message: 'Task title and activity description are required.'
      });
    }

    let totalMins = Number(totalMinutes) || 480;
    if (startTime && endTime) {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      let startM = sh * 60 + sm;
      let endM = eh * 60 + em;
      if (endM < startM) endM += 24 * 60; // Overnight shift handling
      totalMins = Math.max(15, endM - startM);
    }

    const bMins = Math.max(0, Number(breakMinutes) || 0);
    if (bMins >= totalMins) {
      return res.status(422).json({
        success: false,
        message: 'Break duration cannot be equal to or exceed total shift duration.'
      });
    }

    const prodMins = Math.max(15, Math.min(totalMins, Number(productiveMinutes) || (totalMins - bMins)));

    const timesheet = await prisma.dailyTimesheet.create({
      data: {
        userId,
        logDate: String(logDate).trim(),
        projectId: projectId || null,
        taskTitle: String(taskTitle).trim(),
        activityDescription: String(activityDescription).trim(),
        totalMinutes: totalMins,
        productiveMinutes: prodMins,
        activityType: activityType || 'DEVELOPMENT',
        isBillable: !!isBillable,
        status: 'SUBMITTED'
      },
      include: {
        project: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            designation: true,
            reportingManagerId: true
          }
        }
      }
    });

    // Notify Reporting Manager if exists
    if (timesheet.user.reportingManagerId) {
      const notif = await prisma.notification.create({
        data: {
          eventType: 'TIMESHEET_SUBMITTED',
          title: '⏱️ Daily Timesheet Submitted',
          body: `${timesheet.user.firstName} ${timesheet.user.lastName} submitted end-of-day work log for ${logDate} (${Math.round((prodMins / totalMins) * 100)}% productive).`
        }
      });

      await prisma.notificationRecipient.create({
        data: {
          notificationId: notif.id,
          userId: timesheet.user.reportingManagerId,
          isRead: false
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Daily timesheet submitted successfully.',
      data: timesheet
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 2. Get My Timesheets & Productivity Metrics (Paginated)
// -------------------------------------------------------------
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const skip = (page - 1) * limit;

    const { projectId, status, search, fromDate, toDate } = req.query;
    const whereClause: any = { userId };
    if (projectId) whereClause.projectId = String(projectId);
    if (status && status !== 'ALL') whereClause.status = String(status);
    if (search) {
      whereClause.OR = [
        { taskTitle: { contains: String(search) } },
        { activityDescription: { contains: String(search) } }
      ];
    }
    if (fromDate || toDate) {
      whereClause.logDate = {};
      if (fromDate) whereClause.logDate.gte = String(fromDate);
      if (toDate) whereClause.logDate.lte = String(toDate);
    }

    const [totalEntries, timesheets, aggregates] = await Promise.all([
      prisma.dailyTimesheet.count({ where: whereClause }),
      prisma.dailyTimesheet.findMany({
        where: whereClause,
        include: {
          project: true,
          approvedBy: { select: { firstName: true, lastName: true } }
        },
        orderBy: { logDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.dailyTimesheet.aggregate({
        where: { userId },
        _sum: {
          totalMinutes: true,
          productiveMinutes: true
        }
      })
    ]);

    const totalMinutesLogged = aggregates._sum.totalMinutes || 0;
    const totalProductiveMinutes = aggregates._sum.productiveMinutes || 0;
    const avgProductivityPercent = totalMinutesLogged > 0
      ? Math.round((totalProductiveMinutes / totalMinutesLogged) * 100)
      : 0;

    return res.json({
      success: true,
      data: {
        timesheets,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalEntries,
          totalPages: Math.ceil(totalEntries / limit) || 1
        },
        metrics: {
          totalEntries,
          totalHours: Number((totalMinutesLogged / 60).toFixed(1)),
          totalHoursLogged: Number((totalMinutesLogged / 60).toFixed(1)),
          productiveHours: Number((totalProductiveMinutes / 60).toFixed(1)),
          totalProductiveHours: Number((totalProductiveMinutes / 60).toFixed(1)),
          avgProductivityPercent,
          productivityPercent: avgProductivityPercent
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 3. Get Team Timesheets (Manager & Admin View, Paginated)
// -------------------------------------------------------------
router.get('/team', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const role = req.user?.role!;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const skip = (page - 1) * limit;

    let whereClause: any = {};
    if (role === 'MANAGER') {
      whereClause = {
        user: { reportingManagerId: userId }
      };
    } else if (['ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'].includes(role)) {
      whereClause = {};
    } else {
      whereClause = { userId };
    }

    const { projectId, status, search, fromDate, toDate } = req.query;
    if (projectId) whereClause.projectId = String(projectId);
    if (status && status !== 'ALL') whereClause.status = String(status);
    if (search) {
      whereClause.OR = [
        { taskTitle: { contains: String(search) } },
        { activityDescription: { contains: String(search) } },
        { user: { firstName: { contains: String(search) } } },
        { user: { lastName: { contains: String(search) } } }
      ];
    }
    if (fromDate || toDate) {
      whereClause.logDate = {};
      if (fromDate) whereClause.logDate.gte = String(fromDate);
      if (toDate) whereClause.logDate.lte = String(toDate);
    }

    const [totalEntries, timesheets, aggregates] = await Promise.all([
      prisma.dailyTimesheet.count({ where: whereClause }),
      prisma.dailyTimesheet.findMany({
        where: whereClause,
        include: {
          project: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
              designation: true,
              department: { select: { name: true } }
            }
          },
          approvedBy: { select: { firstName: true, lastName: true } }
        },
        orderBy: { logDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.dailyTimesheet.aggregate({
        where: whereClause,
        _sum: {
          totalMinutes: true,
          productiveMinutes: true
        }
      })
    ]);

    const totalMinutesLogged = aggregates._sum.totalMinutes || 0;
    const totalProductiveMinutes = aggregates._sum.productiveMinutes || 0;
    const avgProductivityPercent = totalMinutesLogged > 0
      ? Math.round((totalProductiveMinutes / totalMinutesLogged) * 100)
      : 0;

    return res.json({
      success: true,
      data: {
        timesheets,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalEntries,
          totalPages: Math.ceil(totalEntries / limit) || 1
        },
        metrics: {
          totalEntries,
          totalHoursLogged: Number((totalMinutesLogged / 60).toFixed(1)),
          totalProductiveHours: Number((totalProductiveMinutes / 60).toFixed(1)),
          avgProductivityPercent
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 4. Get All Organizational Timesheets (Admin View, Paginated)
// -------------------------------------------------------------
router.get('/all', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 25));
    const skip = (page - 1) * limit;

    const { projectId, status, logDate, search, fromDate, toDate } = req.query;

    const whereClause: any = {};
    if (projectId) whereClause.projectId = String(projectId);
    if (status && status !== 'ALL') whereClause.status = String(status);
    if (logDate) whereClause.logDate = String(logDate);
    if (search) {
      whereClause.OR = [
        { taskTitle: { contains: String(search) } },
        { activityDescription: { contains: String(search) } },
        { user: { firstName: { contains: String(search) } } },
        { user: { lastName: { contains: String(search) } } }
      ];
    }
    if (fromDate || toDate) {
      whereClause.logDate = {};
      if (fromDate) whereClause.logDate.gte = String(fromDate);
      if (toDate) whereClause.logDate.lte = String(toDate);
    }

    const [totalEntries, timesheets, aggregates] = await Promise.all([
      prisma.dailyTimesheet.count({ where: whereClause }),
      prisma.dailyTimesheet.findMany({
        where: whereClause,
        include: {
          project: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatarUrl: true,
              designation: true,
              department: { select: { name: true } }
            }
          },
          approvedBy: { select: { firstName: true, lastName: true } }
        },
        orderBy: { logDate: 'desc' },
        skip,
        take: limit
      }),
      prisma.dailyTimesheet.aggregate({
        where: whereClause,
        _sum: {
          totalMinutes: true,
          productiveMinutes: true
        }
      })
    ]);

    const totalMinutesLogged = aggregates._sum.totalMinutes || 0;
    const totalProductiveMinutes = aggregates._sum.productiveMinutes || 0;
    const avgProductivityPercent = totalMinutesLogged > 0
      ? Math.round((totalProductiveMinutes / totalMinutesLogged) * 100)
      : 0;

    return res.json({
      success: true,
      data: {
        timesheets,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalEntries,
          totalPages: Math.ceil(totalEntries / limit) || 1
        },
        metrics: {
          totalEntries,
          totalHoursLogged: Number((totalMinutesLogged / 60).toFixed(1)),
          totalProductiveHours: Number((totalProductiveMinutes / 60).toFixed(1)),
          avgProductivityPercent
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 5. Get Active Projects List
// -------------------------------------------------------------
router.get('/projects', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: projects });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 5B. Timesheet Daily Compliance Monitoring (Admin & Manager)
// -------------------------------------------------------------
router.get('/compliance', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const userRole = req.user?.role!;
    const dateParam = (req.query.date as string) || new Date().toISOString().split('T')[0];

    // Build user filter depending on role
    let userWhere: any = { status: 'ACTIVE' };
    if (userRole === 'MANAGER') {
      userWhere.reportingManagerId = userId;
    }

    const allUsers = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        designation: true,
        avatarUrl: true,
        department: { select: { name: true } }
      },
      orderBy: { firstName: 'asc' }
    });

    const dayTimesheets = await prisma.dailyTimesheet.findMany({
      where: {
        logDate: dateParam,
        userId: { in: allUsers.map(u => u.id) }
      },
      include: {
        project: true
      }
    });

    const loggedUserIds = new Set(dayTimesheets.map(t => t.userId));

    const submittedUsers = dayTimesheets.map(t => {
      const u = allUsers.find(user => user.id === t.userId);
      const totalHours = Number(((t.totalMinutes || 0) / 60).toFixed(1));
      return {
        id: t.id,
        timesheetId: t.id,
        userId: t.userId,
        name: `${u?.firstName || ''} ${u?.lastName || ''}`.trim(),
        firstName: u?.firstName || '',
        lastName: u?.lastName || '',
        email: u?.email,
        employeeCode: u?.employeeCode || 'N/A',
        role: u?.role || 'EMPLOYEE',
        designation: u?.designation,
        department: u?.department?.name || 'General',
        avatarUrl: u?.avatarUrl,
        taskTitle: t.taskTitle,
        activityDescription: t.activityDescription,
        totalMinutes: t.totalMinutes,
        totalHours,
        productiveMinutes: t.productiveMinutes,
        projectName: t.project?.name || 'General Task',
        project: t.project,
        activityType: t.activityType,
        user: {
          id: u?.id,
          firstName: u?.firstName,
          lastName: u?.lastName,
          email: u?.email,
          employeeCode: u?.employeeCode,
          role: u?.role,
          department: u?.department?.name || 'General',
          designation: u?.designation,
          avatarUrl: u?.avatarUrl
        }
      };
    });

    const pendingUsers = allUsers
      .filter(u => !loggedUserIds.has(u.id))
      .map(u => ({
        id: u.id,
        userId: u.id,
        name: `${u.firstName} ${u.lastName}`.trim(),
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        employeeCode: u.employeeCode || 'N/A',
        role: u.role || 'EMPLOYEE',
        designation: u.designation,
        department: u.department?.name || 'General',
        avatarUrl: u.avatarUrl,
        user: {
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          employeeCode: u.employeeCode,
          role: u.role,
          department: u.department?.name || 'General',
          designation: u.designation,
          avatarUrl: u.avatarUrl
        }
      }));

    const totalEmployees = allUsers.length;
    const submittedCount = submittedUsers.length;
    const missingCount = pendingUsers.length;
    const complianceRate = totalEmployees > 0 ? Math.round((submittedCount / totalEmployees) * 100) : 100;

    return res.json({
      success: true,
      data: {
        date: dateParam,
        totalEmployees,
        activeHeadcount: totalEmployees,
        submittedCount,
        missingCount,
        complianceRate,
        submittedUsers,
        submitted: submittedUsers,
        pendingUsers,
        missing: pendingUsers
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 6. Create New Project (Admin / HR Admin)
// -------------------------------------------------------------
router.post('/projects', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, description, clientName } = req.body;
    if (!name || !code) {
      return res.status(422).json({ success: false, message: 'Project name and unique code are required.' });
    }

    const project = await prisma.project.create({
      data: {
        name: String(name).trim(),
        code: String(code).trim().toUpperCase(),
        description: description ? String(description).trim() : null,
        clientName: clientName ? String(clientName).trim() : null,
        status: 'ACTIVE'
      }
    });

    return res.status(201).json({ success: true, message: 'Project created successfully.', data: project });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 7. Approve / Reject Timesheet Entry
// -------------------------------------------------------------
router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body; // APPROVED or REJECTED
    const approverId = req.user?.id!;
    const userRole = req.user?.role;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(422).json({ success: false, message: 'Status must be APPROVED or REJECTED.' });
    }

    const timesheet = await prisma.dailyTimesheet.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, reportingManagerId: true } }
      }
    });

    if (!timesheet) {
      return res.status(404).json({ success: false, message: 'Timesheet record not found.' });
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN'].includes(userRole || '');
    const isDirectManager = userRole === 'MANAGER' && timesheet.user.reportingManagerId === approverId;

    if (!isAdmin && !isDirectManager) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to approve or reject this timesheet.'
      });
    }

    const updated = await prisma.dailyTimesheet.update({
      where: { id },
      data: {
        status,
        approvedById: approverId,
        rejectionReason: status === 'REJECTED' ? (rejectionReason || 'Declined by reviewer') : null
      }
    });

    return res.json({
      success: true,
      message: `Timesheet entry ${status.toLowerCase()} successfully.`,
      data: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 8. Get Specific Employee's Timesheet History
// -------------------------------------------------------------
router.get('/employee/:userId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const callerId = req.user?.id!;
    const callerRole = req.user?.role!;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, reportingManagerId: true }
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN'].includes(callerRole);
    const isDirectManager = callerRole === 'MANAGER' && targetUser.reportingManagerId === callerId;
    const isSelf = targetUser.id === callerId;

    if (!isAdmin && !isDirectManager && !isSelf) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied to this employee timesheet.' });
    }

    const timesheets = await prisma.dailyTimesheet.findMany({
      where: { userId },
      include: {
        project: true,
        approvedBy: { select: { firstName: true, lastName: true } }
      },
      orderBy: { logDate: 'desc' },
      take: 60
    });

    const totalMinutesLogged = timesheets.reduce((acc, t) => acc + t.totalMinutes, 0);
    const totalProductiveMinutes = timesheets.reduce((acc, t) => acc + t.productiveMinutes, 0);

    return res.json({
      success: true,
      data: {
        timesheets,
        metrics: {
          totalEntries: timesheets.length,
          totalHoursLogged: +(totalMinutesLogged / 60).toFixed(1),
          totalProductiveHours: +(totalProductiveMinutes / 60).toFixed(1),
          averageProductivityScore: totalMinutesLogged > 0
            ? Math.round((totalProductiveMinutes / totalMinutesLogged) * 100)
            : 100
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 9. Edit / Update Daily Timesheet Entry
// -------------------------------------------------------------
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id!;
    const userRole = req.user?.role!;
    const {
      logDate,
      projectId,
      taskTitle,
      activityDescription,
      totalMinutes,
      productiveMinutes,
      activityType,
      isBillable
    } = req.body;

    const existing = await prisma.dailyTimesheet.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Timesheet record not found.' });
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN'].includes(userRole);
    if (existing.userId !== userId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only edit your own timesheet.' });
    }

    if (existing.status === 'APPROVED' && !isAdmin) {
      return res.status(400).json({ success: false, message: 'Approved timesheets cannot be modified.' });
    }

    const totalMins = totalMinutes !== undefined ? Number(totalMinutes) : existing.totalMinutes;
    const prodMins = productiveMinutes !== undefined ? Number(productiveMinutes) : existing.productiveMinutes;

    const updated = await prisma.dailyTimesheet.update({
      where: { id },
      data: {
        logDate: logDate ? String(logDate).trim() : existing.logDate,
        projectId: projectId !== undefined ? (projectId || null) : existing.projectId,
        taskTitle: taskTitle ? String(taskTitle).trim() : existing.taskTitle,
        activityDescription: activityDescription ? String(activityDescription).trim() : existing.activityDescription,
        totalMinutes: totalMins,
        productiveMinutes: Math.min(totalMins, prodMins),
        activityType: activityType || existing.activityType,
        isBillable: isBillable !== undefined ? !!isBillable : existing.isBillable,
        status: 'SUBMITTED' // reset to submitted on edit for re-review
      },
      include: {
        project: true
      }
    });

    return res.json({
      success: true,
      message: 'Timesheet updated successfully.',
      data: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 10. Delete Daily Timesheet Entry
// -------------------------------------------------------------
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id!;
    const userRole = req.user?.role!;

    const existing = await prisma.dailyTimesheet.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Timesheet record not found.' });
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN'].includes(userRole);
    if (existing.userId !== userId && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Forbidden: You can only delete your own timesheet.' });
    }

    await prisma.dailyTimesheet.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Timesheet record deleted successfully.'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
