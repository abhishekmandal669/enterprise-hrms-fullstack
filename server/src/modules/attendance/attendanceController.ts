import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { eventBus, DomainEvents } from '../../events/eventBus';
import { validateGeofence } from '../../core/utils/geofence';
import { currentGeofence } from '../policies/policyController';
import { calculateDistanceMeters, runAutoAbsentJob, checkAndCreditCompOff } from '../../jobs/attendanceJobs';

const prisma = new PrismaClient();
const router = Router();

// Helper to get YYYY-MM-DD
function getTodayDateStr(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

// -------------------------------------------------------------
// 1. Get Today's Punch State
// -------------------------------------------------------------
router.get('/today', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const todayStr = getTodayDateStr();

    const attendance = await prisma.attendance.findUnique({
      where: {
        userId_attendanceDate: {
          userId,
          attendanceDate: todayStr
        }
      },
      include: {
        breaks: true
      }
    });

    if (!attendance) {
      return res.json({
        success: true,
        data: {
          isClockedIn: false,
          clockInTime: null,
          clockOutTime: null,
          status: 'NOT_CLOCKED_IN',
          isOnBreak: false,
          elapsedSeconds: 0,
          breakSeconds: 0
        }
      });
    }

    const now = new Date();
    const isClockedIn = !attendance.clockOutTime;
    const activeBreak = attendance.breaks.find(b => !b.endTime);
    const isOnBreak = !!activeBreak;

    let elapsedSeconds = 0;
    if (isClockedIn) {
      const startTime = new Date(attendance.clockInTime).getTime();
      elapsedSeconds = Math.floor((now.getTime() - startTime) / 1000);
    } else {
      elapsedSeconds = attendance.totalWorkMinutes * 60;
    }

    let breakSeconds = 0;
    if (isOnBreak && activeBreak) {
      breakSeconds = Math.floor((now.getTime() - new Date(activeBreak.startTime).getTime()) / 1000);
    }

    return res.json({
      success: true,
      data: {
        isClockedIn,
        clockInTime: attendance.clockInTime,
        clockOutTime: attendance.clockOutTime,
        status: attendance.status,
        isOnBreak,
        elapsedSeconds,
        breakSeconds,
        totalWorkMinutes: attendance.totalWorkMinutes,
        totalBreakMinutes: attendance.totalBreakMinutes,
        overtimeMinutes: attendance.overtimeMinutes || 0,
        breaks: attendance.breaks
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 2. Clock-In
// -------------------------------------------------------------
router.post('/clock-in', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const todayStr = getTodayDateStr();
    const now = new Date();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const existing = await prisma.attendance.findUnique({
      where: {
        userId_attendanceDate: { userId, attendanceDate: todayStr }
      }
    });

    if (existing && !existing.clockOutTime) {
      return res.status(400).json({ success: false, message: 'You are already clocked in today.' });
    }

    // Shift Late Logic: 09:00 AM + 15m Grace -> Late after 09:15 AM
    // Half-Day Threshold: 13:30 (1:30 PM) -> Half-Day if clocking in after 13:30
    const [shiftHour, shiftMin] = user.shiftStartTime.split(':').map(Number);
    const shiftStartToday = new Date();
    shiftStartToday.setHours(shiftHour, shiftMin + user.gracePeriodMinutes, 0, 0);

    const halfDayCutoff = new Date();
    halfDayCutoff.setHours(13, 30, 0, 0);

    let status = 'PRESENT';
    if (now > halfDayCutoff) {
      status = 'HALF_DAY';
    } else if (now > shiftStartToday) {
      status = 'LATE';
    }
    const isLate = status === 'LATE';

    const { latitude, longitude } = req.body || {};
    const workMode = req.body?.workMode === 'REMOTE' ? 'REMOTE' : 'OFFICE';
    let distanceMeters: number | null = null;

    if (latitude && longitude) {
      // Lexvera HQ coordinates: lat 28.5355, lng 77.3910
      distanceMeters = calculateDistanceMeters(Number(latitude), Number(longitude), 28.5355, 77.3910);
    }

    // Geofence & GPS Check (Server-Side Enforced)
    if (workMode === 'OFFICE' && latitude && longitude) {
      const MAX_OFFICE_RADIUS_METERS = 1000;
      if (distanceMeters !== null && distanceMeters > MAX_OFFICE_RADIUS_METERS) {
        return res.status(403).json({
          success: false,
          message: `Clock-in rejected: You are ${distanceMeters}m away from Lexvera HQ (Authorized radius: ${MAX_OFFICE_RADIUS_METERS}m). Please select 'Work From Home / Remote' if working off-site.`
        });
      }
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        userId_attendanceDate: { userId, attendanceDate: todayStr }
      },
      create: {
        userId,
        attendanceDate: todayStr,
        clockInTime: now,
        clockInIp: (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1',
        workMode,
        status,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        distanceMeters
      },
      update: {
        clockInTime: now,
        clockOutTime: null,
        workMode,
        status,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        distanceMeters
      }
    });

    // EDA Event Emission
    const eventPayload = {
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      role: user.designation,
      managerId: user.reportingManagerId,
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status,
      workMode
    };

    if (isLate) {
      eventBus.emit(DomainEvents.ATTENDANCE_LATE_DETECTED, eventPayload);
    } else {
      eventBus.emit(DomainEvents.ATTENDANCE_CLOCKED_IN, eventPayload);
    }

    return res.json({
      success: true,
      message: isLate
        ? `Clocked in as ${workMode === 'REMOTE' ? 'Work From Home' : 'Office'} (Late arrival recorded)`
        : `Clocked in as ${workMode === 'REMOTE' ? 'Work From Home' : 'Office'} (On-Time)`,
      data: attendance
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 3. Clock-Out
// -------------------------------------------------------------
router.post('/clock-out', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const todayStr = getTodayDateStr();
    const now = new Date();

    const attendance = await prisma.attendance.findUnique({
      where: {
        userId_attendanceDate: { userId, attendanceDate: todayStr }
      },
      include: { breaks: true, user: true }
    });

    if (!attendance || attendance.clockOutTime) {
      return res.status(400).json({ success: false, message: 'No active clock-in session found today.' });
    }

    // Close any active break
    let activeBreakDuration = 0;
    const activeBreak = attendance.breaks.find(b => !b.endTime);
    if (activeBreak) {
      activeBreakDuration = Math.round((now.getTime() - new Date(activeBreak.startTime).getTime()) / (1000 * 60));
      await prisma.attendanceBreak.update({
        where: { id: activeBreak.id },
        data: { endTime: now, durationMinutes: activeBreakDuration }
      });
    }

    const totalBreaks = (attendance.totalBreakMinutes || 0) + activeBreakDuration;
    const rawElapsedMinutes = Math.round((now.getTime() - new Date(attendance.clockInTime).getTime()) / (1000 * 60));
    const totalMinutesWorked = Math.max(0, rawElapsedMinutes - totalBreaks);

    // Overtime Calculation: Standard shift is 540 mins (9 hrs)
    const STANDARD_SHIFT_MINUTES = 540;
    const overtimeMinutes = totalMinutesWorked > STANDARD_SHIFT_MINUTES ? totalMinutesWorked - STANDARD_SHIFT_MINUTES : 0;

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        clockOutTime: now,
        clockOutIp: (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1',
        totalBreakMinutes: totalBreaks,
        totalWorkMinutes: totalMinutesWorked,
        overtimeMinutes
      }
    });

    // Check & credit Compensatory Off if working on Holiday or Weekend
    const compOffResult = await checkAndCreditCompOff(userId, todayStr, totalMinutesWorked);

    eventBus.emit(DomainEvents.ATTENDANCE_CLOCKED_OUT, {
      userId,
      userName: `${attendance.user.firstName} ${attendance.user.lastName}`,
      totalMinutesWorked,
      overtimeMinutes
    });

    return res.json({
      success: true,
      message: compOffResult.compOffAwarded
        ? `Clocked out successfully. Awarded ${compOffResult.daysAwarded} day(s) Compensatory Off for holiday/weekend working!`
        : overtimeMinutes > 0
        ? `Clocked out successfully. Logged ${Math.floor(overtimeMinutes / 60)}h ${overtimeMinutes % 60}m overtime.`
        : 'Clocked out successfully for the day.',
      data: updated
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 4. Toggle Break (Start / End)
// -------------------------------------------------------------
router.post('/break', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const todayStr = getTodayDateStr();
    const now = new Date();

    const attendance = await prisma.attendance.findUnique({
      where: {
        userId_attendanceDate: { userId, attendanceDate: todayStr }
      },
      include: { breaks: true }
    });

    if (!attendance || attendance.clockOutTime) {
      return res.status(400).json({ success: false, message: 'You must be clocked in to manage breaks.' });
    }

    const activeBreak = attendance.breaks.find(b => !b.endTime);

    if (activeBreak) {
      // End Break
      const breakMinutes = Math.round((now.getTime() - new Date(activeBreak.startTime).getTime()) / (1000 * 60));
      await prisma.attendanceBreak.update({
        where: { id: activeBreak.id },
        data: { endTime: now, durationMinutes: breakMinutes }
      });

      await prisma.attendance.update({
        where: { id: attendance.id },
        data: { totalBreakMinutes: { increment: breakMinutes } }
      });

      return res.json({ success: true, message: 'Break ended. Work timer resumed.', isOnBreak: false });
    } else {
      // Start Break
      await prisma.attendanceBreak.create({
        data: {
          attendanceId: attendance.id,
          breakType: req.body.breakType || 'LUNCH',
          startTime: now
        }
      });

      return res.json({ success: true, message: 'Break started. Work timer paused.', isOnBreak: true });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 5. Monthly Timesheet History
// -------------------------------------------------------------
router.get('/my-timesheet', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const now = new Date();

    const isMonthlyQuery = req.query.month !== undefined || req.query.year !== undefined || req.query.format === 'monthly';

    const targetYear = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
    let targetMonth = req.query.month !== undefined ? parseInt(req.query.month as string, 10) : (now.getMonth() + 1);
    if (targetMonth < 1) targetMonth = 1;
    if (targetMonth > 12) targetMonth = 12;

    const monthStr = String(targetMonth).padStart(2, '0');
    const startDateStr = `${targetYear}-${monthStr}-01`;
    const lastDay = new Date(targetYear, targetMonth, 0).getDate();
    const endDateStr = `${targetYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

    const attendances = await prisma.attendance.findMany({
      where: isMonthlyQuery ? {
        userId,
        attendanceDate: {
          gte: startDateStr,
          lte: endDateStr
        }
      } : { userId },
      include: {
        breaks: true
      },
      orderBy: { attendanceDate: isMonthlyQuery ? 'asc' : 'desc' },
      take: isMonthlyQuery ? 40 : 31
    });

    if (isMonthlyQuery) {
      // Query holidays for this month
      const holidays = await prisma.holiday.findMany({
        where: {
          date: {
            gte: startDateStr,
            lte: endDateStr
          }
        },
        orderBy: { date: 'asc' }
      });

      // Query approved leaves for user in this month
      const leaves = await prisma.leaveRequest.findMany({
        where: {
          userId,
          status: 'APPROVED',
          OR: [
            { fromDate: { lte: endDateStr }, toDate: { gte: startDateStr } }
          ]
        },
        include: {
          leaveType: true
        }
      });

      // Compute KPI summaries
      const presentDays = attendances.filter(a => a.status === 'PRESENT').length;
      const lateDays = attendances.filter(a => a.status === 'LATE').length;
      const halfDays = attendances.filter(a => a.status === 'HALF_DAY').length;
      const absentDays = attendances.filter(a => a.status === 'ABSENT').length;
      const totalWorkMinutes = attendances.reduce((acc, a) => acc + (a.totalWorkMinutes || 0), 0);
      const workedDaysCount = presentDays + lateDays + halfDays;
      const averageWorkMinutesPerDay = workedDaysCount > 0 ? Math.round(totalWorkMinutes / workedDaysCount) : 0;

      return res.json({
        success: true,
        data: {
          attendances,
          holidays,
          leaves,
          summary: {
            totalDaysInMonth: lastDay,
            presentDays,
            lateDays,
            halfDays,
            absentDays,
            leaveDays: leaves.length,
            totalWorkMinutes,
            averageWorkMinutesPerDay
          }
        }
      });
    }

    return res.json({ success: true, data: attendances });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 6. Team Live Presence Roster (For Manager & Admin)
// -------------------------------------------------------------
router.get('/team-roster', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const todayStr = getTodayDateStr();
    let whereUserClause: any = { status: 'ACTIVE' };

    if (req.user?.role === 'MANAGER') {
      whereUserClause = { reportingManagerId: req.user.id, status: 'ACTIVE' };
    }

    const users = await prisma.user.findMany({
      where: whereUserClause,
      include: {
        attendances: {
          where: { attendanceDate: todayStr },
          include: { breaks: true }
        },
        assignedTasks: {
          where: { status: { not: 'DONE' } }
        }
      }
    });

    const roster = users.map(u => {
      const att = u.attendances[0];
      let status = 'ABSENT';
      let clockIn = '—';
      let clockOut = '—';
      let workDuration = '—';

      if (att) {
        if (!att.clockOutTime) {
          const activeBreak = att.breaks.find(b => !b.endTime);
          status = activeBreak ? 'ON_BREAK' : att.status;
        } else {
          status = 'CLOCKED_OUT';
          clockOut = new Date(att.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        clockIn = new Date(att.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const mins = att.totalWorkMinutes || 0;
        workDuration = `${Math.floor(mins / 60)}h ${mins % 60}m`;
      }

      return {
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        role: u.designation,
        avatar: u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120',
        status,
        clockIn,
        clockOut,
        workDuration,
        openTasks: u.assignedTasks.length,
        location: att?.workMode === 'REMOTE' ? 'Remote VPN' : 'Office HQ'
      };
    });

    return res.json({ success: true, data: roster });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 7. Regularization: Submit Request (Employee)
// -------------------------------------------------------------
router.post('/regularize', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { attendanceDate, proposedClockIn, proposedClockOut, reason } = req.body;

    if (!attendanceDate || !proposedClockIn || !proposedClockOut || !reason) {
      return res.status(422).json({ success: false, message: 'All fields (date, in, out, reason) are required.' });
    }

    const reg = await prisma.regularizationRequest.create({
      data: {
        userId,
        attendanceDate,
        proposedClockIn,
        proposedClockOut,
        reason,
        status: 'PENDING'
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Regularization request submitted to manager for approval.',
      data: reg
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 8. Regularization: View Pending Team Requests (Manager/Admin)
// -------------------------------------------------------------
router.get(['/regularize/team', '/regularizations'], authenticate, async (req: AuthRequest, res: Response) => {
  try {
    let userWhere: any = {};
    if (req.user?.role === 'MANAGER') {
      userWhere = { reportingManagerId: req.user.id };
    }

    const requests = await prisma.regularizationRequest.findMany({
      where: {
        user: userWhere,
        status: 'PENDING'
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, designation: true, employeeCode: true, avatarUrl: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: requests });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 9. Regularization: Approve / Reject (Manager/Admin)
// -------------------------------------------------------------
router.patch('/regularize/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body; // APPROVED or REJECTED
    const approverId = req.user?.id!;
    const userRole = req.user?.role;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(422).json({ success: false, message: 'Status must be APPROVED or REJECTED.' });
    }

    const request = await prisma.regularizationRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            reportingManagerId: true
          }
        }
      }
    });

    if (!request || request.status !== 'PENDING') {
      return res.status(404).json({ success: false, message: 'Pending regularization request not found.' });
    }

    // Role & Hierarchy Authorization Check
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN'].includes(userRole || '');
    const isDirectManager = userRole === 'MANAGER' && request.user.reportingManagerId === approverId;

    if (!isAdmin && !isDirectManager) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You do not have permission to approve or reject this regularization request.'
      });
    }

    if (status === 'APPROVED') {
      // Calculate work minutes from proposed times
      const [inH, inM] = request.proposedClockIn.split(':').map(Number);
      const [outH, outM] = request.proposedClockOut.split(':').map(Number);
      const inDate = new Date(`${request.attendanceDate}T${request.proposedClockIn}:00`);
      const outDate = new Date(`${request.attendanceDate}T${request.proposedClockOut}:00`);
      const workMins = Math.max(0, Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60)));

      await prisma.$transaction([
        prisma.regularizationRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedById: approverId
          }
        }),
        prisma.attendance.upsert({
          where: {
            userId_attendanceDate: {
              userId: request.userId,
              attendanceDate: request.attendanceDate
            }
          },
          create: {
            userId: request.userId,
            attendanceDate: request.attendanceDate,
            clockInTime: inDate,
            clockOutTime: outDate,
            status: 'PRESENT',
            isRegularized: true,
            regularizationRemarks: request.reason,
            totalWorkMinutes: workMins
          },
          update: {
            clockInTime: inDate,
            clockOutTime: outDate,
            status: 'PRESENT',
            isRegularized: true,
            regularizationRemarks: request.reason,
            totalWorkMinutes: workMins
          }
        })
      ]);
    } else {
      await prisma.regularizationRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approvedById: approverId,
          rejectionReason: rejectionReason || 'Request declined by manager.'
        }
      });
    }

    return res.json({
      success: true,
      message: `Regularization request ${status.toLowerCase()} successfully.`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 12. Admin Manual Trigger: Auto Absent Marking Job
router.post('/admin/run-auto-absent', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (!['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN'].includes(role || '')) {
      return res.status(403).json({ success: false, message: 'Forbidden: HR Admin or Admin required.' });
    }

    const targetDate = req.body?.date as string | undefined;
    const result = await runAutoAbsentJob(targetDate);

    return res.json({
      success: true,
      message: result.isHolidayOrWeekend
        ? `No auto-absent marked: ${result.date} is a declared holiday or weekend.`
        : `Auto-absent check completed: ${result.markedAbsentCount} employee(s) marked absent.`,
      data: result
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
