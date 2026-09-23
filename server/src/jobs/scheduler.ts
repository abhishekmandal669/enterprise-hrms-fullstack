import cron from 'node-cron';
import { runMonthlyLeaveAccrual, runYearEndCarryForward } from './leaveJobs';
import { runAutoAbsentJob } from './attendanceJobs';

export function initializeScheduledJobs(): void {
  console.log('⏰ [SCHEDULER] Initializing Nexus background cron jobs...');

  // 1. Monthly Leave Accrual: 1st of every month at 00:05 AM
  cron.schedule('5 0 1 * *', async () => {
    console.log('⏰ [CRON:LEAVE_ACCRUAL] Executing monthly leave accrual job...');
    try {
      const res = await runMonthlyLeaveAccrual();
      console.log(`✅ [CRON:LEAVE_ACCRUAL] Success: Credited ${res.creditedUsers} users (${res.totalTransactions} transactions).`);
    } catch (err) {
      console.error('❌ [CRON:LEAVE_ACCRUAL] Error executing monthly accrual:', err);
    }
  });

  // 2. Year-End Carry Forward: Jan 1 at 00:30 AM
  cron.schedule('30 0 1 1 *', async () => {
    console.log('⏰ [CRON:CARRY_FORWARD] Executing year-end leave carry forward job...');
    try {
      const res = await runYearEndCarryForward();
      console.log(`✅ [CRON:CARRY_FORWARD] Success: Processed ${res.usersProcessed} users (${res.totalCarriedForwardDays} PL days carried forward).`);
    } catch (err) {
      console.error('❌ [CRON:CARRY_FORWARD] Error executing carry forward:', err);
    }
  });

  // 3. Auto Absent Marking: Every weekday (Mon-Fri) at 20:00 (8:00 PM)
  cron.schedule('0 20 * * 1-5', async () => {
    console.log('⏰ [CRON:AUTO_ABSENT] Executing EOD auto-absent marking job...');
    try {
      const res = await runAutoAbsentJob();
      console.log(`✅ [CRON:AUTO_ABSENT] Success: Marked ${res.markedAbsentCount} employee(s) absent for ${res.date}.`);
    } catch (err) {
      console.error('❌ [CRON:AUTO_ABSENT] Error executing auto absent job:', err);
    }
  });

  console.log('✅ [SCHEDULER] All cron schedules registered successfully.');
}
