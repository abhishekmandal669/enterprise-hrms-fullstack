import { PrismaClient } from '@prisma/client';
import { creditCompOff } from './leaveJobs';

const prisma = new PrismaClient();

/**
 * Haversine formula to calculate distance in meters between two lat/lng points.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Auto Absent Job (Runs at 20:00 every weekday)
 * Marks active employees without a punch-in and without approved leave as ABSENT.
 */
export async function runAutoAbsentJob(targetDate?: string): Promise<{
  success: boolean;
  markedAbsentCount: number;
  date: string;
  isHolidayOrWeekend: boolean;
  timestamp: string;
}> {
  const today = targetDate || new Date().toISOString().split('T')[0];
  const dateObj = new Date(today + 'T00:00:00');
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 6 = Saturday

  // Check if weekend
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Check if official holiday
  const holiday = await prisma.holiday.findFirst({
    where: { date: today }
  });

  if (isWeekend || holiday) {
    return {
      success: true,
      markedAbsentCount: 0,
      date: today,
      isHolidayOrWeekend: true,
      timestamp: new Date().toISOString()
    };
  }

  // Find all active employees (excluding ADMIN who are exempt)
  const activeEmployees = await prisma.user.findMany({
    where: {
      status: 'ACTIVE',
      role: { notIn: ['ADMIN'] }
    },
    select: { id: true, firstName: true, lastName: true }
  });

  let markedAbsentCount = 0;

  for (const emp of activeEmployees) {
    // 1. Check existing attendance
    const existing = await prisma.attendance.findUnique({
      where: {
        userId_attendanceDate: {
          userId: emp.id,
          attendanceDate: today
        }
      }
    });

    if (existing) continue;

    // 2. Check approved leave covering today
    const approvedLeave = await prisma.leaveRequest.findFirst({
      where: {
        userId: emp.id,
        status: 'APPROVED',
        fromDate: { lte: today },
        toDate: { gte: today }
      }
    });

    if (approvedLeave) continue;

    // 3. Mark as ABSENT
    await prisma.attendance.create({
      data: {
        userId: emp.id,
        attendanceDate: today,
        clockInTime: new Date(today + 'T19:00:00Z'),
        clockOutTime: new Date(today + 'T19:00:00Z'),
        status: 'ABSENT',
        workMode: 'OFFICE',
        totalWorkMinutes: 0,
        totalBreakMinutes: 0,
        overtimeMinutes: 0
      }
    });

    markedAbsentCount++;
  }

  return {
    success: true,
    markedAbsentCount,
    date: today,
    isHolidayOrWeekend: false,
    timestamp: new Date().toISOString()
  };
}

/**
 * Check and credit Compensatory Off if working on Weekend or Holiday.
 */
export async function checkAndCreditCompOff(
  userId: string,
  attendanceDate: string,
  totalWorkMinutes: number
): Promise<{ compOffAwarded: boolean; daysAwarded: number }> {
  // Minimum 4 hours (240 mins) required to qualify for comp-off
  if (totalWorkMinutes < 240) {
    return { compOffAwarded: false, daysAwarded: 0 };
  }

  const dObj = new Date(attendanceDate + 'T00:00:00');
  const dayOfWeek = dObj.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  const holiday = await prisma.holiday.findFirst({
    where: { date: attendanceDate }
  });

  if (!isWeekend && !holiday) {
    return { compOffAwarded: false, daysAwarded: 0 };
  }

  const daysAwarded = totalWorkMinutes >= 480 ? 1.0 : 0.5;
  const reason = holiday
    ? `Compensatory off for working on gazetted holiday: ${holiday.name} (${attendanceDate})`
    : `Compensatory off for weekend shift on ${dObj.toLocaleDateString('en-US', { weekday: 'long' })} (${attendanceDate})`;

  await creditCompOff(userId, daysAwarded, reason);

  return { compOffAwarded: true, daysAwarded };
}
