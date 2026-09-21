/**
 * Shared Enterprise KPI Calculation Engine
 * Formulated according to Section 3.4 of Implementation Blueprint.
 */

export interface AttendanceKPIInput {
  present: number;
  late: number;
  halfDay: number;
  absent: number;
  leaves: number;
  workingDays: number;
  totalWorkMinutes: number;
}

export interface TaskKPIInput {
  totalDue: number;
  completed: number;
  open: number;
  overdue: number;
}

export interface LeaveKPIInput {
  allocated: number;
  used: number;
  pending: number;
}

export const KPIEngine = {
  /**
   * Attendance % = (Present + Late + Half-day * 0.5) / Working Days * 100
   */
  calcAttendancePercent(input: AttendanceKPIInput): number {
    if (input.workingDays <= 0) return 100.0;
    const effectivePresent = input.present + input.late + input.halfDay * 0.5;
    const pct = (effectivePresent / input.workingDays) * 100;
    return Math.min(100.0, Math.max(0.0, Number(pct.toFixed(1))));
  },

  /**
   * Late % = Late punches / Total present punches * 100
   */
  calcLatePercent(late: number, totalPunches: number): number {
    if (totalPunches <= 0) return 0.0;
    return Number(((late / totalPunches) * 100).toFixed(1));
  },

  /**
   * Absenteeism % = Unapproved absent days / Working days * 100
   */
  calcAbsenteeismPercent(absent: number, workingDays: number): number {
    if (workingDays <= 0) return 0.0;
    return Number(((absent / workingDays) * 100).toFixed(1));
  },

  /**
   * Avg Work Hours = Σ total_work_minutes / Present days / 60
   */
  calcAvgWorkHours(totalWorkMinutes: number, presentDays: number): number {
    if (presentDays <= 0) return 0.0;
    const avgMinutes = totalWorkMinutes / presentDays;
    return Number((avgMinutes / 60).toFixed(1));
  },

  /**
   * Punctuality Score = 100 - (late count / present days * 100)
   */
  calcPunctualityScore(late: number, presentDays: number): number {
    if (presentDays <= 0) return 100.0;
    const score = 100 - (late / presentDays) * 100;
    return Math.min(100.0, Math.max(0.0, Number(score.toFixed(1))));
  },

  /**
   * Task Completion % = Tasks DONE in period / Tasks due in period * 100
   */
  calcTaskCompletionRate(completed: number, totalDue: number): number {
    if (totalDue <= 0) return completed > 0 ? 100.0 : 0.0;
    return Number(((completed / totalDue) * 100).toFixed(1));
  },

  /**
   * Overdue Rate % = Overdue tasks / Open tasks * 100
   */
  calcOverdueRate(overdue: number, open: number): number {
    if (open <= 0) return 0.0;
    return Number(((overdue / open) * 100).toFixed(1));
  },

  /**
   * Leave Utilization % = Used leave / Allocated leave * 100
   */
  calcLeaveUtilization(used: number, allocated: number): number {
    if (allocated <= 0) return 0.0;
    return Number(((used / allocated) * 100).toFixed(1));
  }
};
