import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class CustomReportService {
  static getAvailableModules() {
    return [
      {
        id: 'EMPLOYEES',
        label: 'Employees & Workforce Demographics',
        availableColumns: [
          { key: 'employeeCode', label: 'Employee Code' },
          { key: 'fullName', label: 'Full Name' },
          { key: 'email', label: 'Work Email' },
          { key: 'role', label: 'System Role' },
          { key: 'department', label: 'Department' },
          { key: 'designation', label: 'Designation' },
          { key: 'status', label: 'Employment Status' },
          { key: 'joiningDate', label: 'Joining Date' },
          { key: 'phone', label: 'Contact Phone' }
        ]
      },
      {
        id: 'ATTENDANCE',
        label: 'Daily Attendance & Punctuality Logs',
        availableColumns: [
          { key: 'date', label: 'Date' },
          { key: 'employeeCode', label: 'Employee Code' },
          { key: 'fullName', label: 'Full Name' },
          { key: 'clockInTime', label: 'Clock In' },
          { key: 'clockOutTime', label: 'Clock Out' },
          { key: 'totalHours', label: 'Total Hours' },
          { key: 'status', label: 'Attendance Status' },
          { key: 'overtimeMinutes', label: 'Overtime (Mins)' }
        ]
      },
      {
        id: 'LEAVES',
        label: 'Leave Applications & Quota Consumption',
        availableColumns: [
          { key: 'employeeCode', label: 'Employee Code' },
          { key: 'fullName', label: 'Applicant Name' },
          { key: 'leaveType', label: 'Leave Type' },
          { key: 'startDate', label: 'Start Date' },
          { key: 'endDate', label: 'End Date' },
          { key: 'totalDays', label: 'Total Days' },
          { key: 'status', label: 'Approval Status' },
          { key: 'reason', label: 'Stated Reason' }
        ]
      },
      {
        id: 'PAYROLL',
        label: 'Monthly Compensation & Payout Ledger',
        availableColumns: [
          { key: 'period', label: 'Month & Year' },
          { key: 'employeeCode', label: 'Employee Code' },
          { key: 'fullName', label: 'Employee Name' },
          { key: 'grossEarnings', label: 'Gross Pay (₹)' },
          { key: 'totalDeductions', label: 'Deductions (₹)' },
          { key: 'netPay', label: 'Net Pay (₹)' },
          { key: 'presentDays', label: 'Present Days' },
          { key: 'unpaidLeaveDays', label: 'LOP Days' }
        ]
      }
    ];
  }

  static async generateReportData(module: string, selectedColumns: string[], filters?: any) {
    let rows: any[] = [];

    if (module === 'EMPLOYEES') {
      const users = await prisma.user.findMany({
        where: filters?.status ? { status: filters.status } : undefined,
        include: { department: true },
        orderBy: { employeeCode: 'asc' }
      });

      rows = users.map(u => ({
        employeeCode: u.employeeCode,
        fullName: `${u.firstName} ${u.lastName}`.trim(),
        email: u.email,
        role: u.role,
        department: u.department?.name || 'Unassigned',
        designation: u.designation,
        status: u.status,
        joiningDate: u.joiningDate || 'N/A',
        phone: u.phone || 'N/A'
      }));
    } else if (module === 'ATTENDANCE') {
      const attendances = await prisma.attendance.findMany({
        include: { user: true },
        orderBy: { attendanceDate: 'desc' },
        take: 500
      });

      rows = attendances.map(a => ({
        date: a.attendanceDate,
        employeeCode: a.user?.employeeCode || 'N/A',
        fullName: a.user ? `${a.user.firstName} ${a.user.lastName}`.trim() : 'N/A',
        clockInTime: a.clockInTime ? new Date(a.clockInTime).toLocaleTimeString() : 'N/A',
        clockOutTime: a.clockOutTime ? new Date(a.clockOutTime).toLocaleTimeString() : 'N/A',
        totalHours: a.totalWorkMinutes ? (a.totalWorkMinutes / 60).toFixed(2) : '0.00',
        status: a.status,
        overtimeMinutes: a.overtimeMinutes || 0
      }));
    } else if (module === 'LEAVES') {
      const leaves = await prisma.leaveRequest.findMany({
        include: { user: true, leaveType: true },
        orderBy: { fromDate: 'desc' },
        take: 500
      });

      rows = leaves.map(l => ({
        employeeCode: l.user?.employeeCode || 'N/A',
        fullName: l.user ? `${l.user.firstName} ${l.user.lastName}`.trim() : 'N/A',
        leaveType: l.leaveType?.name || 'Leave',
        startDate: l.fromDate,
        endDate: l.toDate,
        totalDays: l.durationDays,
        status: l.status,
        reason: l.reason || 'N/A'
      }));
    } else if (module === 'PAYROLL') {
      const entries = await prisma.payrollEntry.findMany({
        include: { user: true, payrollRun: true },
        orderBy: { createdAt: 'desc' },
        take: 500
      });

      rows = entries.map(e => ({
        period: `${e.payrollRun.month}/${e.payrollRun.year}`,
        employeeCode: e.user.employeeCode,
        fullName: `${e.user.firstName} ${e.user.lastName}`.trim(),
        grossEarnings: e.grossEarnings,
        totalDeductions: e.totalDeductions,
        netPay: e.netPay,
        presentDays: e.presentDays,
        unpaidLeaveDays: e.unpaidLeaveDays
      }));
    }

    // Filter down to selected columns
    const filteredRows = rows.map(r => {
      const rowObj: any = {};
      selectedColumns.forEach(col => {
        rowObj[col] = r[col] !== undefined ? r[col] : '';
      });
      return rowObj;
    });

    return filteredRows;
  }

  static convertToCsv(data: any[], columns: string[]): string {
    if (!data || data.length === 0) return '';
    const header = columns.join(',');
    const rows = data.map(item =>
      columns.map(col => `"${String(item[col] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    return [header, ...rows].join('\n');
  }

  static async saveReportTemplate(data: {
    title: string;
    description?: string;
    module: string;
    columns: string[];
    filters?: any;
    createdById?: string;
  }) {
    return prisma.customReport.create({
      data: {
        title: data.title,
        description: data.description || null,
        module: data.module,
        columnsJson: JSON.stringify(data.columns),
        filtersJson: data.filters ? JSON.stringify(data.filters) : null,
        createdById: data.createdById || null
      }
    });
  }

  static async getSavedReports() {
    const reports = await prisma.customReport.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return reports.map(r => ({
      ...r,
      columns: JSON.parse(r.columnsJson || '[]'),
      filters: r.filtersJson ? JSON.parse(r.filtersJson) : null
    }));
  }
}
