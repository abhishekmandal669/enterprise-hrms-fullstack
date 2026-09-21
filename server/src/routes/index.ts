import { Router } from 'express';

// Existing Modules
import authRoutes from '../modules/auth/authController';
import employeeRoutes from '../modules/employees/employeeController';
import masterDataRoutes from '../modules/master/masterDataController';
import dashboardRoutes from '../modules/dashboard/dashboardController';
import attendanceRoutes from '../modules/attendance/attendanceController';
import leavesRoutes from '../modules/leaves/leavesController';
import tasksRoutes from '../modules/tasks/tasksController';
import broadcastsRoutes from '../modules/broadcasts/broadcastsController';
import notificationsRoutes from '../modules/notifications/notificationsController';
import timesheetsRoutes from '../modules/timesheets/timesheetController';
import mailRoutes from '../modules/mail/mailController';

// New Modules (from issue.txt resolution)
import policyRoutes from '../modules/policies/policyController';
import holidayRoutes from '../modules/holidays/holidayController';
import reportsRoutes from '../modules/reports/reportsController';
import auditLogRoutes from '../modules/audit-logs/auditLogController';
import rolesRoutes from '../modules/roles/rolesController';
import payrollRoutes from '../modules/payroll/payrollController';
import lifecycleRoutes from '../modules/lifecycle/lifecycleController';
import recruitmentRoutes from '../modules/recruitment/recruitmentController';
import trainingRoutes from '../modules/training/trainingController';
import documentRoutes from '../modules/documents/documentController';
import assetRoutes from '../modules/assets/assetController';

const apiRouter = Router();

// Standard Domain Routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/admin/employees', employeeRoutes);
apiRouter.use('/employees', employeeRoutes);
apiRouter.use('/master', masterDataRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/attendance', attendanceRoutes);
apiRouter.use('/leaves', leavesRoutes);
apiRouter.use('/tasks', tasksRoutes);
apiRouter.use('/broadcasts', broadcastsRoutes);
apiRouter.use('/notifications', notificationsRoutes);
apiRouter.use('/timesheets', timesheetsRoutes);
apiRouter.use('/mail', mailRoutes);

// Policy, Governance & Reporting Routes
apiRouter.use('/policies', policyRoutes);
apiRouter.use('/holidays', holidayRoutes);
apiRouter.use('/reports', reportsRoutes);
apiRouter.use('/audit-logs', auditLogRoutes);
apiRouter.use('/roles', rolesRoutes);
apiRouter.use('/payroll', payrollRoutes);
apiRouter.use('/lifecycle', lifecycleRoutes);
apiRouter.use('/recruitment', recruitmentRoutes);
apiRouter.use('/training', trainingRoutes);
apiRouter.use('/documents', documentRoutes);
apiRouter.use('/assets', assetRoutes);

// Backward compatibility & Business-Flow specification aliases
apiRouter.use('/announcements', broadcastsRoutes);
apiRouter.use('/shifts', policyRoutes);
apiRouter.use('/users', employeeRoutes);

export default apiRouter;
