import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { KPIEngine } from '../../utils/kpi';

const prisma = new PrismaClient();
const router = Router();

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const todayStr = getTodayStr();
    const currentYear = new Date().getFullYear();

    // -------------------------------------------------------------
    // 1. Employee Base Data (Computed for Everyone)
    // -------------------------------------------------------------
    const [
      todayAttendance,
      monthAttendances,
      leaveBalances,
      myTasks,
      myPendingLeaves,
      myPendingRegs,
      announcements,
      unreadNotifCount,
      upcomingHolidays,
      todayApprovedLeaves,
      todayRemoteAttendances,
      allUsersWithDob
    ] = await prisma.$transaction([
      // Today Punch
      prisma.attendance.findUnique({
        where: { userId_attendanceDate: { userId: user.id, attendanceDate: todayStr } },
        include: { breaks: true }
      }),
      // Monthly Attendances
      prisma.attendance.findMany({
        where: {
          userId: user.id,
          attendanceDate: { startsWith: todayStr.slice(0, 7) }
        }
      }),
      // Leave Balances
      prisma.leaveBalance.findMany({
        where: { userId: user.id, year: currentYear },
        include: { leaveType: true }
      }),
      // My Tasks
      prisma.task.findMany({
        where: { assignedToId: user.id },
        orderBy: { createdAt: 'desc' }
      }),
      // Pending Leaves
      prisma.leaveRequest.findMany({
        where: { userId: user.id, status: 'PENDING' },
        include: { leaveType: true }
      }),
      // Pending Regularizations
      prisma.regularizationRequest.findMany({
        where: { userId: user.id, status: 'PENDING' }
      }),
      // Announcements
      prisma.announcement.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' }
      }),
      // Unread Notifications Count
      prisma.notificationRecipient.count({
        where: { userId: user.id, isRead: false }
      }),
      // Upcoming Holidays
      prisma.holiday.findMany({
        where: { date: { gte: todayStr } },
        take: 3,
        orderBy: { date: 'asc' }
      }),
      // 10. Approved Leaves for Today (Who is on leave)
      prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          fromDate: { lte: todayStr },
          toDate: { gte: todayStr }
        },
        include: {
          user: { include: { department: true } },
          leaveType: true
        }
      }),
      // 11. Today's WFH / Remote Attendances
      prisma.attendance.findMany({
        where: {
          attendanceDate: todayStr,
          workMode: 'REMOTE'
        },
        include: {
          user: { include: { department: true } },
          breaks: true
        }
      }),
      // 12. Active users for Celebrations (Birthdays, Anniversaries, New Joiners)
      prisma.user.findMany({
        where: { status: 'ACTIVE' },
        include: { department: true }
      })
    ]);

    // Compute Punch State & Live Elapsed Duration
    let punchState = 'NOT_PUNCHED';
    let isLate = false;
    let lateByMinutes = 0;
    let workedMinutes = 0;
    let breakMinutes = 0;
    let elapsedSeconds = 0;
    let breakSeconds = 0;

    const now = new Date();

    if (todayAttendance) {
      isLate = todayAttendance.status === 'LATE';

      if (!todayAttendance.clockOutTime) {
        const activeBreak = todayAttendance.breaks.find(b => !b.endTime);
        punchState = activeBreak ? 'ON_BREAK' : 'WORKING';

        // Calculate live elapsed seconds since clock in
        const startMillis = new Date(todayAttendance.clockInTime).getTime();
        elapsedSeconds = Math.max(0, Math.floor((now.getTime() - startMillis) / 1000));
        workedMinutes = Math.floor(elapsedSeconds / 60);

        if (activeBreak) {
          const breakStartMillis = new Date(activeBreak.startTime).getTime();
          breakSeconds = Math.max(0, Math.floor((now.getTime() - breakStartMillis) / 1000));
          breakMinutes = Math.floor(breakSeconds / 60) + (todayAttendance.totalBreakMinutes || 0);
        } else {
          breakMinutes = todayAttendance.totalBreakMinutes || 0;
        }
      } else {
        punchState = 'DONE';
        workedMinutes = todayAttendance.totalWorkMinutes;
        elapsedSeconds = workedMinutes * 60;
        breakMinutes = todayAttendance.totalBreakMinutes || 0;
      }
    }

    // Compute Monthly Summary
    const presentCount = monthAttendances.filter(a => a.status === 'PRESENT').length;
    const lateCount = monthAttendances.filter(a => a.status === 'LATE').length;
    const halfDayCount = monthAttendances.filter(a => a.status === 'HALF_DAY').length;
    const totalMinutesMonth = monthAttendances.reduce((acc, curr) => acc + curr.totalWorkMinutes, 0);
    const totalHoursMonth = Number((totalMinutesMonth / 60).toFixed(1));
    const workingDaysSoFar = Math.max(1, new Date().getDate());

    const attendancePercent = KPIEngine.calcAttendancePercent({
      present: presentCount,
      late: lateCount,
      halfDay: halfDayCount,
      absent: 0,
      leaves: 0,
      workingDays: workingDaysSoFar,
      totalWorkMinutes: totalMinutesMonth
    });

    const avgHoursPerDay = KPIEngine.calcAvgWorkHours(totalMinutesMonth, presentCount + lateCount);

    // Compute Task Metrics
    const openTasks = myTasks.filter(t => t.status !== 'DONE');
    const overdueTasks = openTasks.filter(t => t.dueDate && t.dueDate < todayStr);
    const dueTodayTasks = openTasks.filter(t => t.dueDate === todayStr);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const todayDate = new Date(`${todayStr}T00:00:00Z`);

    // 1. Birthday Calculation
    const upcomingBirthdays = allUsersWithDob
      .filter(u => !!u.dateOfBirth)
      .map(u => {
        try {
          const dobParts = u.dateOfBirth!.split('-');
          let month = '';
          let day = '';
          if (dobParts.length === 3) {
            month = dobParts[1].padStart(2, '0');
            day = dobParts[2].padStart(2, '0');
          } else if (dobParts.length === 2) {
            month = dobParts[0].padStart(2, '0');
            day = dobParts[1].padStart(2, '0');
          } else {
            return null;
          }

          const currentYearBday = new Date(`${currentYear}-${month}-${day}T00:00:00Z`);
          let targetBday = currentYearBday;
          if (currentYearBday.getTime() < todayDate.getTime()) {
            targetBday = new Date(`${currentYear + 1}-${month}-${day}T00:00:00Z`);
          }

          const diffMs = targetBday.getTime() - todayDate.getTime();
          const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));
          const displayDate = `${parseInt(day, 10)} ${monthNames[parseInt(month, 10) - 1]}`;

          return {
            userId: u.id,
            name: `${u.firstName} ${u.lastName}`,
            avatarUrl: u.avatarUrl,
            designation: u.designation,
            department: u.department?.name || 'Nexus HQ',
            dateOfBirth: u.dateOfBirth,
            displayDate,
            daysUntil,
            isToday: daysUntil === 0
          };
        } catch {
          return null;
        }
      })
      .filter((b): b is NonNullable<typeof b> => b !== null)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 6);

    // 2. Work Anniversaries Calculation
    const workAnniversaries = allUsersWithDob
      .filter(u => !!u.joiningDate)
      .map(u => {
        try {
          const parts = u.joiningDate!.split('-');
          if (parts.length < 3) return null;
          const [jYear, jMonth, jDay] = parts;
          const joinYear = parseInt(jYear, 10);
          const joinMonth = parseInt(jMonth, 10);
          const joinDay = parseInt(jDay, 10);

          const joinDate = new Date(`${jYear}-${jMonth.padStart(2, '0')}-${jDay.padStart(2, '0')}T00:00:00Z`);
          if (isNaN(joinDate.getTime()) || joinDate.getTime() > todayDate.getTime()) return null;

          const thisYearAnniv = new Date(`${currentYear}-${jMonth.padStart(2, '0')}-${jDay.padStart(2, '0')}T00:00:00Z`);
          let targetAnniv = thisYearAnniv;
          let completedYears = currentYear - joinYear;

          const diffFromThisYear = Math.round((thisYearAnniv.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffFromThisYear < -14) {
            targetAnniv = new Date(`${currentYear + 1}-${jMonth.padStart(2, '0')}-${jDay.padStart(2, '0')}T00:00:00Z`);
            completedYears = (currentYear + 1) - joinYear;
          }

          if (completedYears < 1) return null;

          const diffMs = targetAnniv.getTime() - todayDate.getTime();
          const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24));
          const displayDate = `${joinDay} ${monthNames[joinMonth - 1]}`;

          // Include milestones upcoming within 60 days or recently celebrated within 14 days
          if (daysUntil < -14 || daysUntil > 60) return null;

          return {
            userId: u.id,
            name: `${u.firstName} ${u.lastName}`,
            avatarUrl: u.avatarUrl,
            designation: u.designation,
            department: u.department?.name || 'Nexus HQ',
            officialEmail: u.email,
            joiningDate: u.joiningDate,
            yearsCompleted: completedYears,
            displayYears: completedYears === 1 ? '1st Work Anniversary' : completedYears === 2 ? '2nd Work Anniversary' : completedYears === 3 ? '3rd Work Anniversary' : `${completedYears}th Work Anniversary`,
            displayDate,
            daysUntil,
            isToday: daysUntil === 0
          };
        } catch {
          return null;
        }
      })
      .filter((a): a is NonNullable<typeof a> => a !== null)
      .sort((a, b) => Math.abs(a.daysUntil) - Math.abs(b.daysUntil))
      .slice(0, 6);

    // 3. New Joiners Calculation (Joined in last 90 days)
    const newJoiners = allUsersWithDob
      .filter(u => !!u.joiningDate)
      .map(u => {
        try {
          const joinDate = new Date(`${u.joiningDate}T00:00:00Z`);
          if (isNaN(joinDate.getTime())) return null;
          const diffDays = Math.round((todayDate.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0 || diffDays > 90) return null;

          let joinedLabel = 'Joined Today';
          if (diffDays === 1) joinedLabel = 'Joined Yesterday';
          else if (diffDays < 7) joinedLabel = `Joined ${diffDays} days ago`;
          else if (diffDays < 30) joinedLabel = `Joined ${Math.floor(diffDays / 7)}w ago`;
          else joinedLabel = `Joined ${Math.floor(diffDays / 30)}mo ago`;

          return {
            userId: u.id,
            name: `${u.firstName} ${u.lastName}`,
            avatarUrl: u.avatarUrl,
            designation: u.designation,
            department: u.department?.name || 'Nexus HQ',
            officialEmail: u.email,
            joiningDate: u.joiningDate,
            daysSinceJoined: diffDays,
            joinedLabel
          };
        } catch {
          return null;
        }
      })
      .filter((n): n is NonNullable<typeof n> => n !== null)
      .sort((a, b) => a.daysSinceJoined - b.daysSinceJoined)
      .slice(0, 6);

    // 4. Personal Service Milestone & Next Year Countdown for Logged-In User
    const currentUserRecord = allUsersWithDob.find(u => u.id === user.id) || await prisma.user.findUnique({
      where: { id: user.id },
      include: { department: true }
    });

    let personalMilestone: any = null;
    if (currentUserRecord) {
      const rawJoinDate = currentUserRecord.joiningDate || currentUserRecord.createdAt.toISOString().split('T')[0];
      const jDate = new Date(`${rawJoinDate}T00:00:00Z`);
      const elapsedDays = Math.max(0, Math.round((todayDate.getTime() - jDate.getTime()) / (1000 * 60 * 60 * 24)));

      const years = Math.floor(elapsedDays / 365.25);
      const remainingDaysAfterYears = elapsedDays - Math.floor(years * 365.25);
      const months = Math.floor(remainingDaysAfterYears / 30.4375);
      const days = Math.floor(remainingDaysAfterYears % 30.4375);

      let tenureDisplay = '';
      if (years > 0) {
        tenureDisplay = `${years} Year${years > 1 ? 's' : ''}${months > 0 ? `, ${months} Month${months > 1 ? 's' : ''}` : ''}`;
      } else if (months > 0) {
        tenureDisplay = `${months} Month${months > 1 ? 's' : ''}, ${days} Day${days !== 1 ? 's' : ''}`;
      } else {
        tenureDisplay = `${days} Day${days !== 1 ? 's' : ''}`;
      }

      const nextMilestoneYear = years + 1;
      const jParts = rawJoinDate.split('-');
      const jMonth = jParts[1] || '01';
      const jDay = jParts[2] || '01';
      const targetNextAnniv = new Date(`${jDate.getFullYear() + nextMilestoneYear}-${jMonth.padStart(2, '0')}-${jDay.padStart(2, '0')}T00:00:00Z`);
      const prevAnniv = new Date(`${jDate.getFullYear() + years}-${jMonth.padStart(2, '0')}-${jDay.padStart(2, '0')}T00:00:00Z`);

      const daysUntilNextMilestone = Math.max(0, Math.round((targetNextAnniv.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)));
      const cycleTotalDays = Math.max(1, Math.round((targetNextAnniv.getTime() - prevAnniv.getTime()) / (1000 * 60 * 60 * 24)));
      const cycleElapsedDays = Math.max(0, Math.round((todayDate.getTime() - prevAnniv.getTime()) / (1000 * 60 * 60 * 24)));
      const progressPercent = Math.min(100, Math.max(0, Math.round((cycleElapsedDays / cycleTotalDays) * 100)));

      let milestoneBadge = 'Rising Star';
      if (years >= 4) milestoneBadge = 'Executive Pillar';
      else if (years >= 3) milestoneBadge = 'Nexus Veteran';
      else if (years >= 2) milestoneBadge = 'Enterprise Champion';
      else if (years >= 1) milestoneBadge = 'Core Achiever';

      personalMilestone = {
        joiningDate: rawJoinDate,
        totalTenureDays: elapsedDays,
        years,
        months,
        days,
        tenureDisplay,
        nextMilestoneYear,
        nextMilestoneLabel: nextMilestoneYear === 1 ? '1st Work Anniversary' : nextMilestoneYear === 2 ? '2nd Work Anniversary' : nextMilestoneYear === 3 ? '3rd Work Anniversary' : `${nextMilestoneYear}th Work Anniversary`,
        targetDate: targetNextAnniv.toISOString().split('T')[0],
        daysUntilNextMilestone,
        progressPercent,
        milestoneBadge
      };
    }

    const onLeaveToday = todayApprovedLeaves.map(l => ({
      id: l.id,
      userId: l.userId,
      name: `${l.user.firstName} ${l.user.lastName}`,
      avatarUrl: l.user.avatarUrl,
      designation: l.user.designation,
      department: l.user.department?.name || 'General',
      leaveType: l.leaveType.name,
      leaveTypeCode: l.leaveType.code,
      durationDays: l.durationDays,
      isHalfDay: l.isHalfDay,
      halfDaySlot: l.halfDaySlot,
      fromDate: l.fromDate,
      toDate: l.toDate
    }));

    const workingFromHomeToday = todayRemoteAttendances.map(a => {
      let status = 'WORKING';
      if (a.clockOutTime) {
        status = 'CLOCKED_OUT';
      } else if (a.breaks.some(b => !b.endTime)) {
        status = 'ON_BREAK';
      } else if (a.status === 'LATE') {
        status = 'LATE';
      }

      return {
        id: a.id,
        userId: a.userId,
        name: `${a.user.firstName} ${a.user.lastName}`,
        avatarUrl: a.user.avatarUrl,
        designation: a.user.designation,
        department: a.user.department?.name || 'General',
        clockInTime: a.clockInTime ? new Date(a.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
        status
      };
    });

    const basePayload: any = {
      role: user.role,
      generatedAt: new Date().toISOString(),
      punch: {
        state: punchState,
        clockInTime: todayAttendance?.clockInTime || null,
        clockOutTime: todayAttendance?.clockOutTime || null,
        isLate,
        lateByMinutes,
        workedMinutes,
        breakMinutes,
        elapsedSeconds,
        breakSeconds,
        workMode: todayAttendance?.workMode || 'OFFICE'
      },
      monthSummary: {
        present: presentCount,
        late: lateCount,
        absent: 0,
        halfDay: halfDayCount,
        leaves: 0,
        totalHours: totalHoursMonth,
        avgHoursPerDay,
        attendancePercent
      },
      leaveBalances: leaveBalances.map(lb => ({
        type: lb.leaveType.name,
        code: lb.leaveType.code,
        allocated: lb.totalAllocated,
        used: lb.used,
        pending: lb.pendingApproval,
        available: Math.max(0, lb.totalAllocated - lb.used - lb.pendingApproval)
      })),
      tasks: {
        open: openTasks.length,
        overdue: overdueTasks.length,
        dueToday: dueTodayTasks.length,
        byStatus: {
          TODO: myTasks.filter(t => t.status === 'TODO').length,
          IN_PROGRESS: myTasks.filter(t => t.status === 'IN_PROGRESS').length,
          DONE: myTasks.filter(t => t.status === 'DONE').length
        },
        top: openTasks.slice(0, 3).map(t => ({
          id: t.id,
          title: t.title,
          priority: t.priority,
          status: t.status,
          dueDate: t.dueDate
        }))
      },
      pendingRequests: [
        ...myPendingLeaves.map(l => ({ type: 'LEAVE', id: l.id, details: `${l.leaveType.name} (${l.durationDays}d)` })),
        ...myPendingRegs.map(r => ({ type: 'REGULARIZATION', id: r.id, details: `Punch for ${r.attendanceDate}` }))
      ],
      announcements: announcements.map(a => ({
        id: a.id,
        title: a.title,
        priority: a.priority,
        createdAt: a.createdAt
      })),
      unreadNotifications: unreadNotifCount,
      upcoming: upcomingHolidays.map(h => ({ type: 'HOLIDAY', date: h.date, label: h.name })),
      onLeaveToday,
      workingFromHomeToday,
      upcomingBirthdays,
      workAnniversaries,
      newJoiners,
      personalMilestone
    };

    // -------------------------------------------------------------
    // 2. Manager Team Block
    // -------------------------------------------------------------
    if (['MANAGER', 'ADMIN', 'HR_ADMIN'].includes(user.role)) {
      const isManager = user.role === 'MANAGER';
      const teamUserFilter = isManager ? { reportingManagerId: user.id, status: 'ACTIVE' } : { status: 'ACTIVE' };

      const teamMembers = await prisma.user.findMany({
        where: teamUserFilter,
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

      const teamPendingLeaves = await prisma.leaveRequest.count({
        where: {
          user: isManager ? { reportingManagerId: user.id } : {},
          status: 'PENDING'
        }
      });

      const teamPendingRegs = await prisma.regularizationRequest.count({
        where: {
          user: isManager ? { reportingManagerId: user.id } : {},
          status: 'PENDING'
        }
      });

      const teamPendingTimesheets = await prisma.dailyTimesheet.count({
        where: {
          user: isManager ? { reportingManagerId: user.id } : {},
          status: 'SUBMITTED'
        }
      });

      const dayOfWeekTeam = new Date().getDay();
      const isWeekendTeam = dayOfWeekTeam === 0 || dayOfWeekTeam === 6;
      const holidayTodayTeam = upcomingHolidays.find(h => h.date === todayStr);
      const isHolidayTeam = !!holidayTodayTeam;
      const teamTasks = await prisma.task.findMany({
        where: {
          assignedTo: isManager ? { reportingManagerId: user.id } : {}
        }
      });

      const presentMembers = teamMembers.filter(m => m.attendances.length > 0);
      const lateMembers = teamMembers.filter(m => m.attendances.some(a => a.status === 'LATE'));

      const teamMembersOnLeave = teamMembers.filter(m => todayApprovedLeaves.some(l => l.userId === m.id)).length;
      const effectiveTeamScheduled = Math.max(1, teamMembers.length - teamMembersOnLeave);

      let teamPresentRate = 100;
      if (!isWeekendTeam && !isHolidayTeam) {
        teamPresentRate = teamMembers.length > 0
          ? Number(Math.min(100, (presentMembers.length / effectiveTeamScheduled) * 100).toFixed(1))
          : 100;
      }

      basePayload.team = {
        size: teamMembers.length,
        present: presentMembers.length,
        late: lateMembers.length,
        onLeave: teamMembersOnLeave,
        absent: Math.max(0, teamMembers.length - presentMembers.length - teamMembersOnLeave),
        isWeekend: isWeekendTeam,
        isHoliday: isHolidayTeam,
        holidayName: holidayTodayTeam?.name || null,
        presentPercent: teamPresentRate,
        roster: teamMembers.slice(0, 15).map(m => {
          const att = m.attendances[0];
          let status = 'ABSENT';
          let clockIn = '—';
          if (att) {
            if (!att.clockOutTime) {
              const activeBreak = att.breaks.find(b => !b.endTime);
              status = activeBreak ? 'ON_BREAK' : att.status;
            } else {
              status = 'CLOCKED_OUT';
            }
            clockIn = new Date(att.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
          return {
            userId: m.id,
            name: `${m.firstName} ${m.lastName}`,
            designation: m.designation,
            avatarUrl: m.avatarUrl,
            status,
            clockIn,
            workedMinutes: att?.totalWorkMinutes || 0,
            openTasks: m.assignedTasks.length
          };
        }),
        pendingApprovals: {
          leave: teamPendingLeaves,
          regularization: teamPendingRegs,
          timesheet: teamPendingTimesheets,
          total: teamPendingLeaves + teamPendingRegs + teamPendingTimesheets
        },
        taskBoard: {
          todo: teamTasks.filter(t => t.status === 'TODO').length,
          inProgress: teamTasks.filter(t => t.status === 'IN_PROGRESS').length,
          done: teamTasks.filter(t => t.status === 'DONE').length,
          overdue: teamTasks.filter(t => t.status !== 'DONE' && t.dueDate && t.dueDate < todayStr).length
        }
      };
    }

    // -------------------------------------------------------------
    // 3. Admin / Org Block
    // -------------------------------------------------------------
    if (['ADMIN', 'HR_ADMIN'].includes(user.role)) {
      const [
        totalUsers,
        activeUsers,
        probationUsers,
        invitedUsers,
        departments,
        allTodayAttendance,
        orgPendingApprovals,
        orgPendingRegs,
        orgPendingTimesheets,
        allOrgTasks
      ] = await prisma.$transaction([
        prisma.user.count(),
        prisma.user.count({ where: { status: 'ACTIVE' } }),
        prisma.user.count({ where: { status: 'PROBATION' } }),
        prisma.user.count({ where: { status: 'INVITED' } }),
        prisma.department.findMany({
          where: { isActive: true },
          include: {
            users: {
              where: { status: 'ACTIVE' },
              include: { attendances: { where: { attendanceDate: todayStr } } }
            }
          }
        }),
        prisma.attendance.findMany({
          where: { attendanceDate: todayStr }
        }),
        prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
        prisma.regularizationRequest.count({ where: { status: 'PENDING' } }),
        prisma.dailyTimesheet.count({ where: { status: 'SUBMITTED' } }),
        prisma.task.findMany()
      ]);

      const presentOrg = allTodayAttendance.length;
      const lateOrg = allTodayAttendance.filter(a => a.status === 'LATE').length;
      const wfhOrg = allTodayAttendance.filter(a => a.workMode === 'REMOTE').length;
      const onLeaveCount = todayApprovedLeaves.length;

      const dayOfWeek = new Date().getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const holidayToday = upcomingHolidays.find(h => h.date === todayStr);
      const isHoliday = !!holidayToday;

      // Dynamic denominator: scheduled users minus approved full-day leaves
      const scheduledUsers = Math.max(1, activeUsers - onLeaveCount);
      let dynamicOrgPercent = 100;
      if (!isWeekend && !isHoliday) {
        dynamicOrgPercent = activeUsers > 0
          ? Number(Math.min(100, (presentOrg / scheduledUsers) * 100).toFixed(1))
          : 100;
      }

      basePayload.org = {
        headcount: {
          total: totalUsers,
          active: activeUsers,
          probation: probationUsers,
          pendingInvites: invitedUsers,
          breakdown: {
            active: activeUsers,
            probation: probationUsers,
            invited: invitedUsers,
            inactive: Math.max(0, totalUsers - activeUsers - probationUsers - invitedUsers)
          }
        },
        attendance: {
          present: presentOrg,
          percent: dynamicOrgPercent,
          late: lateOrg,
          wfh: wfhOrg,
          onLeave: onLeaveCount,
          isWeekend,
          isHoliday,
          holidayName: holidayToday?.name || null
        },
        approvals: {
          total: orgPendingApprovals + orgPendingRegs + orgPendingTimesheets,
          leaves: orgPendingApprovals,
          regularizations: orgPendingRegs,
          timesheets: orgPendingTimesheets
        },
        tasks: {
          open: allOrgTasks.filter(t => t.status !== 'DONE').length,
          overdue: allOrgTasks.filter(t => t.status !== 'DONE' && t.dueDate && t.dueDate < todayStr).length,
          completionRate: allOrgTasks.length > 0
            ? Number(((allOrgTasks.filter(t => t.status === 'DONE').length / allOrgTasks.length) * 100).toFixed(1))
            : 100
        },
        departments: departments.map(d => {
          const deptActive = d.users.length;
          const deptPresent = d.users.filter(u => u.attendances.length > 0).length;
          return {
            id: d.id,
            name: d.name,
            size: deptActive,
            present: deptPresent,
            attendancePercent: deptActive > 0 ? Number(((deptPresent / deptActive) * 100).toFixed(1)) : 100
          };
        }),
        exceptions: {
          pendingInvites: invitedUsers,
          pendingLeaves: orgPendingApprovals
        }
      };
    }

    return res.json({
      success: true,
      data: basePayload
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
