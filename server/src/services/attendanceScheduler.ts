import { PrismaClient } from '@prisma/client';
import { eventBus, DomainEvents } from '../events/eventBus';

const prisma = new PrismaClient();

export async function processNightlyAutoClockout(): Promise<number> {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const now = new Date();

    // Find all attendance records where employee clocked in but forgot to clock out
    const unclosedAttendances = await prisma.attendance.findMany({
      where: {
        clockOutTime: null
      },
      include: {
        breaks: true,
        user: true
      }
    });

    if (unclosedAttendances.length === 0) {
      return 0;
    }

    let processedCount = 0;

    for (const record of unclosedAttendances) {
      // 1. Close any active break that was left open
      const activeBreak = record.breaks.find(b => !b.endTime);
      let additionalBreakMins = 0;
      if (activeBreak) {
        additionalBreakMins = Math.max(0, Math.round((now.getTime() - new Date(activeBreak.startTime).getTime()) / (1000 * 60)));
        await prisma.attendanceBreak.update({
          where: { id: activeBreak.id },
          data: {
            endTime: now,
            durationMinutes: additionalBreakMins
          }
        });
      }

      const totalBreaks = (record.totalBreakMinutes || 0) + additionalBreakMins;

      // 2. Set auto-clockout timestamp (Standard 8-hour shift or current time)
      const shiftEndStr = record.user.shiftEndTime || '18:00';
      const autoClockOutDate = new Date(`${record.attendanceDate}T${shiftEndStr}:00`);
      
      // Calculate work duration: capped standard shift (e.g. 480 mins) minus breaks
      const standardShiftMins = 480;
      const totalWorkMinutes = Math.max(0, standardShiftMins - totalBreaks);

      await prisma.attendance.update({
        where: { id: record.id },
        data: {
          clockOutTime: autoClockOutDate,
          clockOutIp: '127.0.0.1 (System-AutoClockout)',
          totalBreakMinutes: totalBreaks,
          totalWorkMinutes,
          isRegularized: false,
          regularizationRemarks: 'Auto clocked out by system daemon due to unclosed punch. Please submit regularization if times differ.'
        }
      });

      // 3. Create In-App Notification for employee
      const notif = await prisma.notification.create({
        data: {
          eventType: 'ATTENDANCE_REGULARIZATION_REQUESTED',
          title: '⚠️ Auto Clock-Out Triggered',
          body: `You did not clock out on ${record.attendanceDate}. An auto clock-out was recorded. Please review and submit a regularization request if needed.`
        }
      });

      await prisma.notificationRecipient.create({
        data: {
          notificationId: notif.id,
          userId: record.userId,
          isRead: false
        }
      });

      processedCount++;
    }

    if (processedCount > 0) {
      console.log(`[AutoClockout Daemon] Successfully auto-clocked out ${processedCount} unclosed shifts.`);
    }

    return processedCount;
  } catch (error) {
    console.error('[AutoClockout Daemon Error]:', error);
    return 0;
  }
}

let autoClockoutInterval: NodeJS.Timeout | null = null;

export function startAttendanceScheduler() {
  // Run once upon startup
  processNightlyAutoClockout();

  // Run periodic check every 30 minutes
  autoClockoutInterval = setInterval(() => {
    processNightlyAutoClockout();
  }, 30 * 60 * 1000);

  console.log('[Attendance Scheduler] Initialized auto-clockout daemon (runs every 30m).');
}

export function stopAttendanceScheduler() {
  if (autoClockoutInterval) {
    clearInterval(autoClockoutInterval);
    autoClockoutInterval = null;
  }
}
