import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate, requireRoles } from '../../middleware/auth';
import { jsonToCsv } from '../../core/utils/csvExporter';
import { CustomReportService } from './customReportService';

const prisma = new PrismaClient();
const router = Router();

// -------------------------------------------------------------
// 1. Export Attendance Records (CSV)
// -------------------------------------------------------------
router.get('/attendance/export', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, departmentId } = req.query;
    const userRole = req.user?.role!;
    const userId = req.user?.id!;

    let userWhere: any = {};
    if (userRole === 'MANAGER') {
      userWhere.reportingManagerId = userId;
    } else if (departmentId) {
      userWhere.departmentId = String(departmentId);
    }

    const where: any = {};
    if (startDate && endDate) {
      where.attendanceDate = { gte: String(startDate), lte: String(endDate) };
    }
    if (Object.keys(userWhere).length > 0) {
      where.user = userWhere;
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
            email: true,
            designation: true,
            department: { select: { name: true } }
          }
        }
      },
      orderBy: { attendanceDate: 'desc' },
      take: 1000
    });

    const rows = records.map((r: any) => ({
      date: r.attendanceDate,
      employeeCode: r.user?.employeeCode || 'N/A',
      employeeName: `${r.user?.firstName || ''} ${r.user?.lastName || ''}`.trim(),
      department: r.user?.department?.name || 'General',
      designation: r.user?.designation || 'Staff',
      status: r.status,
      clockIn: r.clockInTime ? new Date(r.clockInTime).toLocaleTimeString() : '',
      clockOut: r.clockOutTime ? new Date(r.clockOutTime).toLocaleTimeString() : '',
      workHours: (r.totalWorkMinutes / 60).toFixed(2),
      breakMinutes: r.totalBreakMinutes,
      workMode: r.workMode
    }));

    const csv = jsonToCsv(rows, [
      { key: 'date', label: 'Date' },
      { key: 'employeeCode', label: 'Employee Code' },
      { key: 'employeeName', label: 'Employee Name' },
      { key: 'department', label: 'Department' },
      { key: 'designation', label: 'Designation' },
      { key: 'status', label: 'Status' },
      { key: 'clockIn', label: 'Clock In' },
      { key: 'clockOut', label: 'Clock Out' },
      { key: 'workHours', label: 'Work Hours' },
      { key: 'breakMinutes', label: 'Break Mins' },
      { key: 'workMode', label: 'Work Mode' }
    ]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="attendance_report_${Date.now()}.csv"`);
    return res.send(csv);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 2. Export Leave Records (CSV)
// -------------------------------------------------------------
router.get('/leaves/export', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role!;
    const userId = req.user?.id!;

    let userWhere: any = {};
    if (userRole === 'MANAGER') {
      userWhere.reportingManagerId = userId;
    }

    const leaves = await prisma.leaveRequest.findMany({
      where: Object.keys(userWhere).length > 0 ? { user: userWhere } : {},
      include: {
        user: {
          select: {
            employeeCode: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } }
          }
        },
        leaveType: true,
        approvedBy: { select: { firstName: true, lastName: true } }
      },
      orderBy: { fromDate: 'desc' },
      take: 1000
    });

    const rows = leaves.map((l: any) => ({
      employeeName: `${l.user?.firstName || ''} ${l.user?.lastName || ''}`.trim(),
      department: l.user?.department?.name || 'General',
      leaveType: l.leaveType?.name || 'Standard',
      fromDate: l.fromDate,
      toDate: l.toDate,
      durationDays: l.durationDays,
      status: l.status,
      approver: l.approvedBy ? `${l.approvedBy.firstName} ${l.approvedBy.lastName}` : 'Pending/Auto',
      reason: l.reason
    }));

    const csv = jsonToCsv(rows, [
      { key: 'employeeName', label: 'Employee Name' },
      { key: 'department', label: 'Department' },
      { key: 'leaveType', label: 'Leave Type' },
      { key: 'fromDate', label: 'From Date' },
      { key: 'toDate', label: 'To Date' },
      { key: 'durationDays', label: 'Days' },
      { key: 'status', label: 'Status' },
      { key: 'approver', label: 'Approver' },
      { key: 'reason', label: 'Reason' }
    ]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="leaves_report_${Date.now()}.csv"`);
    return res.send(csv);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 3. Export Employee Directory (CSV)
// -------------------------------------------------------------
router.get('/employees/export', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const employees = await prisma.user.findMany({
      include: {
        department: true,
        reportingManager: { select: { firstName: true, lastName: true } }
      },
      orderBy: { employeeCode: 'asc' }
    });

    const rows = employees.map((e: any) => ({
      employeeCode: e.employeeCode || '',
      name: `${e.firstName} ${e.lastName}`,
      email: e.email,
      phone: e.phone || '',
      role: e.role,
      department: e.department?.name || 'General',
      designation: e.designation || '',
      status: e.status,
      reportingManager: e.reportingManager ? `${e.reportingManager.firstName} ${e.reportingManager.lastName}` : 'None',
      dateOfJoining: e.createdAt ? new Date(e.createdAt).toISOString().split('T')[0] : ''
    }));

    const csv = jsonToCsv(rows, [
      { key: 'employeeCode', label: 'Employee Code' },
      { key: 'name', label: 'Full Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'role', label: 'Role' },
      { key: 'department', label: 'Department' },
      { key: 'designation', label: 'Designation' },
      { key: 'status', label: 'Status' },
      { key: 'reportingManager', label: 'Reporting Manager' },
      { key: 'dateOfJoining', label: 'Joining Date' }
    ]);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="employee_directory_${Date.now()}.csv"`);
    return res.send(csv);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 5. Dynamic Custom Report Builder
// -------------------------------------------------------------
router.get('/custom/modules', authenticate, (req: AuthRequest, res: Response) => {
  return res.json({
    success: true,
    data: CustomReportService.getAvailableModules()
  });
});

router.post('/custom/preview', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { module, columns, filters } = req.body;
    if (!module || !columns || !Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({ success: false, message: 'Module and at least one column are required' });
    }

    const rows = await CustomReportService.generateReportData(module, columns, filters);
    return res.json({
      success: true,
      data: {
        totalRows: rows.length,
        preview: rows.slice(0, 100),
        rows
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/custom/export', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { module, columns, filters, filename } = req.body;
    if (!module || !columns || !Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({ success: false, message: 'Module and at least one column are required' });
    }

    const rows = await CustomReportService.generateReportData(module, columns, filters);
    const csv = CustomReportService.convertToCsv(rows, columns);

    const safeName = filename || `custom_report_${module.toLowerCase()}_${Date.now()}`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.csv"`);
    return res.send(csv);
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/custom/templates', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const templates = await CustomReportService.getSavedReports();
    return res.json({ success: true, data: templates });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/custom/templates', authenticate, requireRoles('ADMIN', 'HR_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, module, columns, filters } = req.body;
    if (!title || !module || !columns) {
      return res.status(400).json({ success: false, message: 'Title, module, and columns are required' });
    }

    const template = await CustomReportService.saveReportTemplate({
      title,
      description,
      module,
      columns,
      filters,
      createdById: req.user?.id
    });

    return res.status(201).json({ success: true, data: template });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
