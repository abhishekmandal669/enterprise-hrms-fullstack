/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import process from 'process';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 [Admin-Only Seed] Starting complete database purge and Super Admin provisioning...');

  // 1. Purge all records across all modules
  console.log('   - Purging all module records and historical data...');
  try { await prisma.assetAssignment.deleteMany(); } catch (_) {}
  try { await prisma.asset.deleteMany(); } catch (_) {}
  try { await prisma.document.deleteMany(); } catch (_) {}
  try { await prisma.delegationRequest.deleteMany(); } catch (_) {}
  try { await prisma.customReport.deleteMany(); } catch (_) {}
  try { await prisma.certification.deleteMany(); } catch (_) {}
  try { await prisma.trainingEnrollment.deleteMany(); } catch (_) {}
  try { await prisma.trainingProgram.deleteMany(); } catch (_) {}
  try { await prisma.offerLetter.deleteMany(); } catch (_) {}
  try { await prisma.interview.deleteMany(); } catch (_) {}
  try { await prisma.jobApplication.deleteMany(); } catch (_) {}
  try { await prisma.candidate.deleteMany(); } catch (_) {}
  try { await prisma.jobOpening.deleteMany(); } catch (_) {}
  try { await prisma.exitRecord.deleteMany(); } catch (_) {}
  try { await prisma.offboardingTask.deleteMany(); } catch (_) {}
  try { await prisma.onboardingTask.deleteMany(); } catch (_) {}
  try { await prisma.payrollEntry.deleteMany(); } catch (_) {}
  try { await prisma.payrollRun.deleteMany(); } catch (_) {}
  try { await prisma.salaryStructure.deleteMany(); } catch (_) {}
  try { await prisma.internalEmailAttachment.deleteMany(); } catch (_) {}
  try { await prisma.internalEmailRecipient.deleteMany(); } catch (_) {}
  try { await prisma.internalEmail.deleteMany(); } catch (_) {}
  try { await prisma.dailyTimesheet.deleteMany(); } catch (_) {}
  try { await prisma.project.deleteMany(); } catch (_) {}
  try { await prisma.auditLog.deleteMany(); } catch (_) {}
  try { await prisma.notificationRecipient.deleteMany(); } catch (_) {}
  try { await prisma.notification.deleteMany(); } catch (_) {}
  try { await prisma.notificationTemplate.deleteMany(); } catch (_) {}
  try { await prisma.announcement.deleteMany(); } catch (_) {}
  try { await prisma.taskComment.deleteMany(); } catch (_) {}
  try { await prisma.taskAssignee.deleteMany(); } catch (_) {}
  try { await prisma.task.deleteMany(); } catch (_) {}
  try { await prisma.regularizationRequest.deleteMany(); } catch (_) {}
  try { await prisma.leaveRequest.deleteMany(); } catch (_) {}
  try { await prisma.leaveBalanceHistory.deleteMany(); } catch (_) {}
  try { await prisma.leaveBalance.deleteMany(); } catch (_) {}
  try { await prisma.leaveType.deleteMany(); } catch (_) {}
  try { await prisma.attendanceBreak.deleteMany(); } catch (_) {}
  try { await prisma.attendance.deleteMany(); } catch (_) {}
  try { await prisma.refreshToken.deleteMany(); } catch (_) {}
  try { await prisma.userSession.deleteMany(); } catch (_) {}
  try { await prisma.passwordReset.deleteMany(); } catch (_) {}
  try { await prisma.userInvite.deleteMany(); } catch (_) {}
  try { await prisma.userPermissionOverride.deleteMany(); } catch (_) {}
  try { await prisma.rolePermission.deleteMany(); } catch (_) {}
  try { await prisma.permission.deleteMany(); } catch (_) {}
  try { await prisma.role.deleteMany(); } catch (_) {}
  try { await prisma.userDashboardLayout.deleteMany(); } catch (_) {}
  try { await prisma.dashboardWidget.deleteMany(); } catch (_) {}
  try { await prisma.masterData.deleteMany(); } catch (_) {}
  try { await prisma.holiday.deleteMany(); } catch (_) {}
  try { await prisma.shift.deleteMany(); } catch (_) {}
  try { await prisma.user.deleteMany(); } catch (_) {}
  try { await prisma.department.deleteMany(); } catch (_) {}

  console.log('   ✓ Database purged cleanly.');

  // 2. Granular Permissions (50+ Keys)
  console.log('   - Seeding system permissions and RBAC matrix...');
  const permissionsList = [
    // Auth & Profile
    { key: 'auth.login', module: 'AUTH', description: 'Can log into portal' },
    { key: 'auth.sessions.view', module: 'AUTH', description: 'View active device sessions' },
    { key: 'auth.sessions.revoke', module: 'AUTH', description: 'Revoke active device sessions' },
    { key: 'profile.view.self', module: 'AUTH', description: 'View own employee profile' },
    { key: 'profile.edit.self', module: 'AUTH', description: 'Edit emergency contact, phone, address' },

    // Attendance
    { key: 'attendance.clock', module: 'ATTENDANCE', description: 'Clock in, clock out, and take breaks' },
    { key: 'attendance.view.self', module: 'ATTENDANCE', description: 'View own attendance calendar and timesheet' },
    { key: 'attendance.regularize.apply', module: 'ATTENDANCE', description: 'Submit missed punch regularization request' },
    { key: 'attendance.view.team', module: 'ATTENDANCE', description: 'View team live presence roster' },
    { key: 'attendance.regularize.approve', module: 'ATTENDANCE', description: 'Approve or reject team regularization requests' },
    { key: 'attendance.view.org', module: 'ATTENDANCE', description: 'View org-wide live attendance matrix' },
    { key: 'attendance.override.org', module: 'ATTENDANCE', description: 'Admin override of any attendance record' },

    // Leaves
    { key: 'leave.view.self', module: 'LEAVE', description: 'View own leave balances and history' },
    { key: 'leave.apply', module: 'LEAVE', description: 'Apply for leave' },
    { key: 'leave.cancel.self', module: 'LEAVE', description: 'Cancel pending or future approved leave' },
    { key: 'leave.approve.team', module: 'LEAVE', description: 'Approve or reject team leave applications' },
    { key: 'leave.view.team', module: 'LEAVE', description: 'View team leave calendar and staffing risk' },
    { key: 'leave.manage.org', module: 'LEAVE', description: 'Admin manage quotas, policies, and overrides' },

    // Tasks (Kanban)
    { key: 'task.create.self', module: 'TASK', description: 'Create personal tasks for self' },
    { key: 'task.status.update', module: 'TASK', description: 'Update status of assigned tasks' },
    { key: 'task.assign.team', module: 'TASK', description: 'Assign deliverables to direct reportees' },
    { key: 'task.view.team', module: 'TASK', description: 'View team Kanban board and workload' },
    { key: 'task.assign.any', module: 'TASK', description: 'Assign tasks to anyone across the company' },
    { key: 'task.delete.any', module: 'TASK', description: 'Delete or archive any task' },

    // Broadcasts & Notifications
    { key: 'broadcast.view', module: 'BROADCAST', description: 'Read corporate announcements' },
    { key: 'broadcast.create', module: 'BROADCAST', description: 'Create and publish targeted broadcasts' },
    { key: 'broadcast.urgent', module: 'BROADCAST', description: 'Publish screen-freeze urgent notices' },
    { key: 'notification.view', module: 'BROADCAST', description: 'View in-app notification drawer' },

    // Reports & Compliance
    { key: 'reports.view.self', module: 'REPORT', description: 'Download own monthly timesheets' },
    { key: 'reports.view.team', module: 'REPORT', description: 'Generate team attendance and leave reports' },
    { key: 'reports.view.org', module: 'REPORT', description: 'Export org-wide compliance and audit reports' },

    // Admin & Employee Ops
    { key: 'employee.create', module: 'ADMIN', description: 'Onboard employees and send invite tokens' },
    { key: 'employee.bulk_import', module: 'ADMIN', description: 'Import employees in bulk via CSV' },
    { key: 'employee.manage.status', module: 'ADMIN', description: 'Suspend, reactivate, or exit employees' },
    { key: 'policy.manage', module: 'ADMIN', description: 'Configure shifts, leave policies, and holidays' },
    { key: 'audit.view', module: 'ADMIN', description: 'Inspect full enterprise audit log trail' }
  ];

  for (const p of permissionsList) {
    await prisma.permission.create({ data: p });
  }

  // 3. System Roles
  const roleAdmin = await prisma.role.create({
    data: { name: 'Super Administrator', code: 'ADMIN', description: 'Full system and organizational oversight', isSystem: true }
  });
  const roleHR = await prisma.role.create({
    data: { name: 'HR Administrator', code: 'HR_ADMIN', description: 'People operations, leaves, and onboarding', isSystem: true }
  });
  const roleManager = await prisma.role.create({
    data: { name: 'Department Manager', code: 'MANAGER', description: 'Team attendance, approvals, and delegation', isSystem: true }
  });
  const roleEmployee = await prisma.role.create({
    data: { name: 'Employee', code: 'EMPLOYEE', description: 'Self-service attendance, tasks, and leaves', isSystem: true }
  });

  const allPerms = await prisma.permission.findMany();
  for (const perm of allPerms) {
    await prisma.rolePermission.create({
      data: { roleId: roleAdmin.id, permissionId: perm.id }
    });
  }

  // 4. Standard Shifts
  console.log('   - Seeding shifts & holidays...');
  await prisma.shift.createMany({
    data: [
      { name: 'General Shift', code: 'GEN_09_18', startTime: '09:00', endTime: '18:00', graceMinutes: 15, breakMinutes: 60, weekOffs: '[0,6]' },
      { name: 'Early Morning Shift', code: 'MORN_07_16', startTime: '07:00', endTime: '16:00', graceMinutes: 10, breakMinutes: 60, weekOffs: '[0,6]' },
      { name: 'UK Support Shift', code: 'UK_13_22', startTime: '13:30', endTime: '22:30', graceMinutes: 15, breakMinutes: 60, weekOffs: '[0,6]' }
    ]
  });

  // 5. Holidays 2026
  await prisma.holiday.createMany({
    data: [
      { date: '2026-01-26', name: 'Republic Day', description: 'National Holiday' },
      { date: '2026-03-04', name: 'Holi', description: 'Festival of Colors' },
      { date: '2026-08-15', name: 'Independence Day', description: 'National Holiday' },
      { date: '2026-10-02', name: 'Mahatma Gandhi Jayanti', description: 'National Holiday' },
      { date: '2026-11-08', name: 'Diwali', description: 'Festival of Lights' },
      { date: '2026-12-25', name: 'Christmas', description: 'Gazetted Holiday' }
    ]
  });

  // 6. Master Data Dropdowns
  console.log('   - Seeding master data dropdowns...');
  await prisma.masterData.createMany({
    data: [
      { category: 'DESIGNATION', key: 'DIR_ENG', label: 'Director of Engineering', sortOrder: 1 },
      { category: 'DESIGNATION', key: 'SR_FE', label: 'Senior Frontend Engineer', sortOrder: 2 },
      { category: 'DESIGNATION', key: 'ARCH_BE', label: 'Backend Architect', sortOrder: 3 },
      { category: 'DESIGNATION', key: 'LEAD_UI', label: 'Lead UI/UX Designer', sortOrder: 4 },
      { category: 'DESIGNATION', key: 'DEVOPS_ENG', label: 'DevOps Specialist', sortOrder: 5 },
      { category: 'DESIGNATION', key: 'HR_MGR', label: 'HR Operations Manager', sortOrder: 6 },
      { category: 'WORK_MODE', key: 'OFFICE', label: 'On-Site Office', sortOrder: 1 },
      { category: 'WORK_MODE', key: 'REMOTE', label: 'Remote / Work From Home', sortOrder: 2 },
      { category: 'WORK_MODE', key: 'HYBRID', label: 'Hybrid Flexibility', sortOrder: 3 },
      { category: 'EXIT_REASON', key: 'BETTER_OPP', label: 'Career Advancement / Higher Offer', sortOrder: 1 },
      { category: 'EXIT_REASON', key: 'RELOCATION', label: 'Personal Relocation', sortOrder: 2 }
    ]
  });

  // 7. Dashboard Widgets
  console.log('   - Seeding dashboard widget registry...');
  await prisma.dashboardWidget.createMany({
    data: [
      { widgetKey: 'punch_clock', title: 'Live Punch Clock', allowedRoles: '["EMPLOYEE","MANAGER","ADMIN","HR_ADMIN"]', defaultPosition: 1, defaultSize: 'MD' },
      { widgetKey: 'month_snapshot', title: 'Monthly Timesheet Snapshot', allowedRoles: '["EMPLOYEE","MANAGER","ADMIN","HR_ADMIN"]', defaultPosition: 2, defaultSize: 'MD' },
      { widgetKey: 'leave_balances', title: 'Leave Quotas & Balances', allowedRoles: '["EMPLOYEE","MANAGER","ADMIN","HR_ADMIN"]', defaultPosition: 3, defaultSize: 'MD' },
      { widgetKey: 'my_tasks', title: 'My Operational Deliverables', allowedRoles: '["EMPLOYEE","MANAGER","ADMIN","HR_ADMIN"]', defaultPosition: 4, defaultSize: 'MD' },
      { widgetKey: 'team_roster', title: 'Live Team Presence Roster', allowedRoles: '["MANAGER","ADMIN","HR_ADMIN"]', requiredPermission: 'attendance.view.team', defaultPosition: 5, defaultSize: 'LG' },
      { widgetKey: 'approval_inbox', title: 'Leave & Regularization Approvals', allowedRoles: '["MANAGER","ADMIN","HR_ADMIN"]', requiredPermission: 'leave.approve.team', defaultPosition: 6, defaultSize: 'MD' },
      { widgetKey: 'team_kanban', title: 'Team Workload & Kanban Summary', allowedRoles: '["MANAGER","ADMIN","HR_ADMIN"]', requiredPermission: 'task.view.team', defaultPosition: 7, defaultSize: 'MD' },
      { widgetKey: 'org_kpis', title: 'Organization 360° Health KPIs', allowedRoles: '["ADMIN","HR_ADMIN"]', requiredPermission: 'attendance.view.org', defaultPosition: 8, defaultSize: 'FULL' },
      { widgetKey: 'dept_breakdown', title: 'Department Matrix & Attendance %', allowedRoles: '["ADMIN","HR_ADMIN"]', requiredPermission: 'attendance.view.org', defaultPosition: 9, defaultSize: 'FULL' }
    ]
  });

  // 8. Departments
  console.log('   - Seeding foundational departments...');
  const deptExec = await prisma.department.create({ data: { name: 'Executive Board', code: 'EXEC' } });
  const deptEng = await prisma.department.create({ data: { name: 'Engineering & Product', code: 'ENG' } });
  const deptHR = await prisma.department.create({ data: { name: 'HR & People Operations', code: 'HR' } });
  const deptSales = await prisma.department.create({ data: { name: 'Sales & BD', code: 'SALES' } });

  // 9. Leave Types
  console.log('   - Seeding leave types...');
  const ltPaid = await prisma.leaveType.create({
    data: { name: 'Paid Leave (PL)', code: 'PL', annualQuota: 18, isPaid: true, carryForwardMax: 6 }
  });
  const ltCasual = await prisma.leaveType.create({
    data: { name: 'Casual Leave (CL)', code: 'CL', annualQuota: 12, isPaid: true }
  });
  const ltSick = await prisma.leaveType.create({
    data: { name: 'Sick Leave (SL)', code: 'SL', annualQuota: 8, isPaid: true, requiresDocAfter: 2 }
  });
  const ltCompOff = await prisma.leaveType.create({
    data: { name: 'Compensatory Off (COMP_OFF)', code: 'COMP_OFF', annualQuota: 0, isPaid: true, carryForwardMax: 10 }
  });

  // 10. Passwords
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 11. Create ONLY ONE USER: Super Administrator
  console.log('   - Seeding the Single Super Admin Account (NEX-001)...');
  const adminUser = await prisma.user.create({
    data: {
      employeeCode: 'NEX-001',
      firstName: 'Vikramaditya',
      lastName: 'Roy',
      email: 'admin@nexus.com',
      officialEmail: 'admin@nexus.internal',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      profileCompleted: true,
      emailVerifiedAt: new Date(),
      designation: 'Super Administrator / HR Head',
      departmentId: deptExec.id,
      dateOfBirth: '1988-10-04',
      joiningDate: '2022-01-10',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'
    }
  });

  // 12. Admin Initial Leave Balances
  await prisma.leaveBalance.createMany({
    data: [
      { userId: adminUser.id, leaveTypeId: ltPaid.id, year: 2026, totalAllocated: 18, used: 0, pendingApproval: 0, carriedForward: 0 },
      { userId: adminUser.id, leaveTypeId: ltCasual.id, year: 2026, totalAllocated: 12, used: 0, pendingApproval: 0, carriedForward: 0 },
      { userId: adminUser.id, leaveTypeId: ltSick.id, year: 2026, totalAllocated: 8, used: 0, pendingApproval: 0, carriedForward: 0 },
      { userId: adminUser.id, leaveTypeId: ltCompOff.id, year: 2026, totalAllocated: 0, used: 0, pendingApproval: 0, carriedForward: 0 }
    ]
  });

  // 13. Admin Dashboard Layout
  await prisma.userDashboardLayout.create({
    data: {
      userId: adminUser.id,
      layout: JSON.stringify(['punch_clock', 'month_snapshot', 'leave_balances', 'my_tasks', 'approval_inbox', 'org_kpis', 'dept_breakdown'])
    }
  });

  // 14. Initial Welcome Internal Email in Webmail
  await prisma.internalEmail.create({
    data: {
      senderId: adminUser.id,
      subject: 'Welcome to Clean Enterprise HRMS Environment',
      body: '<p>Welcome Super Administrator Vikramaditya Roy,</p><p>The system database has been cleared. Only the Super Administrator account is active. You can now configure fresh policies, invite employees, and test all modules from scratch.</p>',
      isSystemEmail: true,
      recipients: {
        create: [
          { userId: adminUser.id, recipientType: 'TO', isRead: false }
        ]
      }
    }
  });

  console.log('\n=======================================================');
  console.log('✅ DATABASE RESET COMPLETED! ONLY ADMIN DATA PRESERVED:');
  console.log('-------------------------------------------------------');
  console.log('👤 Employee Code: NEX-001');
  console.log('👤 Name:          Vikramaditya Roy');
  console.log('📧 Email:         admin@nexus.com');
  console.log('🔑 Password:      password123');
  console.log('🛡️ Role:          ADMIN (Super Administrator)');
  console.log('👥 Total Users:   1 (Only Admin in database)');
  console.log('=======================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Reset error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
