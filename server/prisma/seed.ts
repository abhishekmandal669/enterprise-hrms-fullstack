/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import process from 'process';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Comprehensive Enterprise HRMS Seed with Dynamic Engines & RBAC...');

  // 1. Clean existing records in reverse dependency order
  await prisma.dailyTimesheet.deleteMany();
  await prisma.project.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notificationRecipient.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.notificationTemplate.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.taskComment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.regularizationRequest.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.attendanceBreak.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.userInvite.deleteMany();
  await prisma.userPermissionOverride.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.userDashboardLayout.deleteMany();
  await prisma.dashboardWidget.deleteMany();
  await prisma.masterData.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  // 2. Dynamic Engine: Permissions (Granular 50+ Keys)
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

  // 3. Dynamic Engine: Roles
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
  
  // Assign all permissions to ADMIN
  for (const perm of allPerms) {
    await prisma.rolePermission.create({
      data: { roleId: roleAdmin.id, permissionId: perm.id }
    });
  }

  // Assign HR_ADMIN permissions
  const hrPerms = allPerms.filter(p => !['policy.manage', 'task.delete.any'].includes(p.key));
  for (const perm of hrPerms) {
    await prisma.rolePermission.create({
      data: { roleId: roleHR.id, permissionId: perm.id }
    });
  }

  // Assign MANAGER permissions
  const managerPerms = allPerms.filter(p => 
    p.key.includes('.self') || 
    p.key.includes('.team') || 
    p.key === 'auth.login' ||
    p.key === 'attendance.clock' ||
    p.key === 'leave.apply' ||
    p.key === 'task.create.self' ||
    p.key === 'task.status.update' ||
    p.key === 'broadcast.view' ||
    p.key === 'notification.view'
  );
  for (const perm of managerPerms) {
    await prisma.rolePermission.create({
      data: { roleId: roleManager.id, permissionId: perm.id }
    });
  }

  // Assign EMPLOYEE permissions
  const empPerms = allPerms.filter(p => 
    p.key.includes('.self') || 
    p.key === 'auth.login' ||
    p.key === 'attendance.clock' ||
    p.key === 'attendance.regularize.apply' ||
    p.key === 'leave.apply' ||
    p.key === 'task.create.self' ||
    p.key === 'task.status.update' ||
    p.key === 'broadcast.view' ||
    p.key === 'notification.view'
  );
  for (const perm of empPerms) {
    await prisma.rolePermission.create({
      data: { roleId: roleEmployee.id, permissionId: perm.id }
    });
  }

  // 4. Dynamic Engine: Shifts
  await prisma.shift.createMany({
    data: [
      { name: 'General Shift', code: 'GEN_09_18', startTime: '09:00', endTime: '18:00', graceMinutes: 15, breakMinutes: 60, weekOffs: '[0,6]' },
      { name: 'Early Morning Shift', code: 'MORN_07_16', startTime: '07:00', endTime: '16:00', graceMinutes: 10, breakMinutes: 60, weekOffs: '[0,6]' },
      { name: 'UK Support Shift', code: 'UK_13_22', startTime: '13:30', endTime: '22:30', graceMinutes: 15, breakMinutes: 60, weekOffs: '[0,6]' }
    ]
  });

  // 5. Dynamic Engine: Holidays 2026
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

  // 6. Dynamic Engine: Master Data Dropdowns
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

  // 7. Dynamic Engine: Dashboard Widgets
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

  // 8. Create Departments
  const deptExec = await prisma.department.create({ data: { name: 'Executive Board', code: 'EXEC' } });
  const deptEng = await prisma.department.create({ data: { name: 'Engineering & Product', code: 'ENG' } });
  const deptHR = await prisma.department.create({ data: { name: 'HR & People Operations', code: 'HR' } });
  const deptSales = await prisma.department.create({ data: { name: 'Sales & BD', code: 'SALES' } });

  // 9. Create Leave Types
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

  // 11. Create Super Admin
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
      departmentId: deptHR.id,
      dateOfBirth: '1988-10-04',
      joiningDate: '2022-01-10',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'
    }
  });

  // 12. Create HR Admin
  const hrUser = await prisma.user.create({
    data: {
      employeeCode: 'NEX-003',
      firstName: 'Anita',
      lastName: 'Deshmukh',
      email: 'hr@nexus.com',
      officialEmail: 'anita.deshmukh@nexus.internal',
      passwordHash: hashedPassword,
      role: 'HR_ADMIN',
      status: 'ACTIVE',
      profileCompleted: true,
      emailVerifiedAt: new Date(),
      designation: 'People Operations Lead',
      departmentId: deptHR.id,
      dateOfBirth: '1992-09-18', // Birthday Today!
      joiningDate: '2023-09-22',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=120'
    }
  });

  // 13. Create Department Manager
  const managerUser = await prisma.user.create({
    data: {
      employeeCode: 'NEX-002',
      firstName: 'Priya',
      lastName: 'Narayanan',
      email: 'manager@nexus.com',
      officialEmail: 'priya.narayanan@nexus.internal',
      passwordHash: hashedPassword,
      role: 'MANAGER',
      status: 'ACTIVE',
      profileCompleted: true,
      emailVerifiedAt: new Date(),
      designation: 'Director of Engineering',
      departmentId: deptEng.id,
      dateOfBirth: '1990-09-22', // In 4 days
      joiningDate: '2024-03-15',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120'
    }
  });

  // 14. Create Active Employees reporting to Manager
  const employeeRahul = await prisma.user.create({
    data: {
      employeeCode: 'NEX-101',
      firstName: 'Rahul',
      lastName: 'Sharma',
      email: 'employee@nexus.com',
      officialEmail: 'rahul.sharma@nexus.internal',
      passwordHash: hashedPassword,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      profileCompleted: true,
      emailVerifiedAt: new Date(),
      designation: 'Senior Frontend Engineer',
      departmentId: deptEng.id,
      reportingManagerId: managerUser.id,
      dateOfBirth: '1995-10-15',
      joiningDate: '2025-09-18',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120'
    }
  });

  const employeeAnanya = await prisma.user.create({
    data: {
      employeeCode: 'NEX-102',
      firstName: 'Ananya',
      lastName: 'Verma',
      email: 'ananya.v@nexus.com',
      officialEmail: 'ananya.verma@nexus.internal',
      passwordHash: hashedPassword,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      profileCompleted: true,
      emailVerifiedAt: new Date(),
      designation: 'Backend Architect',
      departmentId: deptEng.id,
      reportingManagerId: managerUser.id,
      dateOfBirth: '1997-09-20', // In 2 days
      joiningDate: '2025-02-14',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120'
    }
  });

  const employeeKaran = await prisma.user.create({
    data: {
      employeeCode: 'NEX-103',
      firstName: 'Karan',
      lastName: 'Mehra',
      email: 'karan.m@nexus.com',
      officialEmail: 'karan.mehra@nexus.internal',
      passwordHash: hashedPassword,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      profileCompleted: true,
      emailVerifiedAt: new Date(),
      designation: 'Lead UI/UX Designer',
      departmentId: deptEng.id,
      reportingManagerId: managerUser.id,
      dateOfBirth: '1994-09-28', // In 10 days
      joiningDate: '2025-09-28',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120'
    }
  });

  const employeeSneha = await prisma.user.create({
    data: {
      employeeCode: 'NEX-104',
      firstName: 'Sneha',
      lastName: 'Patel',
      email: 'sneha.p@nexus.com',
      officialEmail: 'sneha.patel@nexus.internal',
      passwordHash: hashedPassword,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
      profileCompleted: true,
      emailVerifiedAt: new Date(),
      designation: 'DevOps Specialist',
      departmentId: deptEng.id,
      reportingManagerId: managerUser.id,
      dateOfBirth: '1996-11-05',
      joiningDate: '2026-08-20',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120'
    }
  });

  // Probation Employee
  const employeeArun = await prisma.user.create({
    data: {
      employeeCode: 'NEX-105',
      firstName: 'Arun',
      lastName: 'Kumar',
      email: 'arun.k@nexus.com',
      officialEmail: 'arun.kumar@nexus.internal',
      passwordHash: hashedPassword,
      role: 'EMPLOYEE',
      status: 'PROBATION',
      profileCompleted: true,
      emailVerifiedAt: new Date(),
      designation: 'Junior QA Engineer',
      departmentId: deptEng.id,
      reportingManagerId: managerUser.id,
      dateOfBirth: '1998-12-12',
      joiningDate: '2026-09-02',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=120'
    }
  });

  // Invited User (No password set yet)
  const invitedUser = await prisma.user.create({
    data: {
      employeeCode: 'NEX-106',
      firstName: 'Rohit',
      lastName: 'Shukla',
      email: 'rohit.s@nexus.com',
      officialEmail: 'rohit.shukla@nexus.internal',
      passwordHash: null,
      role: 'EMPLOYEE',
      status: 'INVITED',
      profileCompleted: false,
      designation: 'Product Analyst',
      departmentId: deptEng.id,
      reportingManagerId: managerUser.id,
      avatarUrl: null
    }
  });

  // Create invite token for invited user (72h validity)
  const sampleToken = 'invite-token-rohit-72h-valid-key';
  const hashedInviteToken = await bcrypt.hash(sampleToken, 10);
  await prisma.userInvite.create({
    data: {
      userId: invitedUser.id,
      tokenHash: hashedInviteToken,
      invitedById: adminUser.id,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000)
    }
  });

  // 15. Allocate Leave Balances for 2026
  const activeUsers = [adminUser, hrUser, managerUser, employeeRahul, employeeAnanya, employeeKaran, employeeSneha, employeeArun];
  for (const user of activeUsers) {
    await prisma.leaveBalance.createMany({
      data: [
        { userId: user.id, leaveTypeId: ltPaid.id, year: 2026, totalAllocated: 18, used: user.id === employeeRahul.id ? 3 : 1 },
        { userId: user.id, leaveTypeId: ltCasual.id, year: 2026, totalAllocated: 12, used: user.id === employeeRahul.id ? 4 : 2 },
        { userId: user.id, leaveTypeId: ltSick.id, year: 2026, totalAllocated: 8, used: user.id === employeeRahul.id ? 2 : 0 }
      ]
    });
  }

  // 16. Today's Attendance Seed (18 Sep 2026)
  const todayStr = '2026-09-18';
  const now = new Date();

  await prisma.attendance.create({
    data: {
      userId: employeeRahul.id,
      attendanceDate: todayStr,
      clockInTime: new Date(now.setHours(9, 8, 24)),
      clockInIp: '192.168.1.104',
      status: 'PRESENT',
      totalWorkMinutes: 250
    }
  });

  await prisma.attendance.create({
    data: {
      userId: employeeAnanya.id,
      attendanceDate: todayStr,
      clockInTime: new Date(now.setHours(8, 52, 10)),
      clockInIp: '192.168.1.108',
      status: 'PRESENT',
      totalWorkMinutes: 266
    }
  });

  await prisma.attendance.create({
    data: {
      userId: employeeKaran.id,
      attendanceDate: todayStr,
      clockInTime: new Date(now.setHours(9, 35, 0)),
      clockInIp: '10.0.4.12 (VPN)',
      workMode: 'REMOTE',
      status: 'LATE',
      totalWorkMinutes: 225
    }
  });

  const snehaAtt = await prisma.attendance.create({
    data: {
      userId: employeeSneha.id,
      attendanceDate: todayStr,
      clockInTime: new Date(now.setHours(9, 2, 0)),
      clockInIp: '192.168.1.115',
      status: 'PRESENT',
      totalWorkMinutes: 240,
      totalBreakMinutes: 18
    }
  });

  await prisma.attendanceBreak.create({
    data: {
      attendanceId: snehaAtt.id,
      breakType: 'TEA',
      startTime: new Date(now.setHours(11, 15, 0)),
      endTime: new Date(now.setHours(11, 33, 0)),
      durationMinutes: 18
    }
  });

  // Regularization request seed
  await prisma.regularizationRequest.create({
    data: {
      userId: employeeRahul.id,
      attendanceDate: '2026-09-17',
      proposedClockIn: '09:00',
      proposedClockOut: '18:15',
      reason: 'Biometric device network glitch during morning punch.',
      status: 'PENDING'
    }
  });

  // 17. Leave Requests
  await prisma.leaveRequest.create({
    data: {
      userId: employeeSneha.id,
      leaveTypeId: ltCasual.id,
      fromDate: '2026-09-18',
      toDate: '2026-09-18',
      durationDays: 1.0,
      reason: 'Family event and personal administrative commitment.',
      status: 'APPROVED',
      approvedById: managerUser.id
    }
  });

  await prisma.leaveRequest.create({
    data: {
      userId: employeeRahul.id,
      leaveTypeId: ltPaid.id,
      fromDate: '2026-09-22',
      toDate: '2026-09-23',
      durationDays: 2.0,
      reason: 'Attending family wedding ceremony in hometown.',
      status: 'PENDING'
    }
  });

  await prisma.leaveRequest.create({
    data: {
      userId: employeeAnanya.id,
      leaveTypeId: ltCasual.id,
      fromDate: '2026-09-25',
      toDate: '2026-09-25',
      durationDays: 1.0,
      reason: 'Personal administrative work at municipal registry.',
      status: 'PENDING'
    }
  });

  // 18. Tasks Seed
  const task1 = await prisma.task.create({
    data: {
      title: 'Fix OAuth Login Session Expiry Edge Case',
      description: 'Resolve session cookie timeout on mobile Safari when authenticating via SSO.',
      createdById: employeeRahul.id,
      assignedToId: employeeRahul.id,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: '2026-09-20'
    }
  });

  await prisma.taskComment.create({
    data: {
      taskId: task1.id,
      authorId: managerUser.id,
      content: 'Make sure to test across iOS 17 and Android Chrome before staging deployment.'
    }
  });

  await prisma.task.createMany({
    data: [
      {
        title: 'Deploy v2 Real-Time Attendance API',
        description: 'Deploy Redis cluster adapter for horizontal WebSocket scaling on production.',
        createdById: managerUser.id,
        assignedToId: employeeRahul.id,
        priority: 'URGENT',
        status: 'TODO',
        dueDate: '2026-09-21'
      },
      {
        title: 'Optimize Database Connection Pool',
        description: 'Tune Prisma connection pool size to prevent exhaustion during peak morning punch hours.',
        createdById: managerUser.id,
        assignedToId: employeeAnanya.id,
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        dueDate: '2026-09-22'
      },
      {
        title: 'Corporate UI/UX Design System Audit',
        description: 'Review contrast ratios, dark mode tokens, and WCAG accessibility standards.',
        createdById: managerUser.id,
        assignedToId: employeeKaran.id,
        priority: 'MEDIUM',
        status: 'DONE',
        dueDate: '2026-09-17'
      },
      {
        title: 'Quarterly Security Compliance Report',
        description: 'Compile ISO 27001 audit checklist and user access reviews.',
        createdById: adminUser.id,
        assignedToId: managerUser.id,
        priority: 'HIGH',
        status: 'TODO',
        dueDate: '2026-09-25'
      }
    ]
  });

  // 19. Broadcasts & Notifications
  await prisma.announcement.create({
    data: {
      senderId: adminUser.id,
      title: 'Quarterly Town Hall & System Upgrade Notice',
      content: 'All departments are requested to complete timesheet reviews by 5 PM today ahead of quarterly compliance auditing.',
      priority: 'URGENT',
      targetType: 'ALL'
    }
  });

  const notif1 = await prisma.notification.create({
    data: {
      eventType: 'HR_BROADCAST',
      title: '🚨 Urgent HR Notice',
      body: 'Quarterly Town Hall & System Upgrade notice posted.'
    }
  });

  for (const user of activeUsers) {
    await prisma.notificationRecipient.create({
      data: {
        notificationId: notif1.id,
        userId: user.id,
        isRead: user.id === adminUser.id
      }
    });
  }

  // 20. Seed Enterprise Projects
  const projCore = await prisma.project.create({
    data: {
      name: 'Nexus Core HRMS & Cloud ERP',
      code: 'PRJ-NEX-01',
      description: 'Centralized workforce management, real-time presence engine, and RBAC portal.',
      clientName: 'Nexus Global Corp',
      status: 'ACTIVE'
    }
  });

  const projMobile = await prisma.project.create({
    data: {
      name: 'Enterprise Mobile & Field Presence App',
      code: 'PRJ-MOB-02',
      description: 'Cross-platform mobile client with geofenced clock-in and push notifications.',
      clientName: 'Apex Innovations Ltd',
      status: 'ACTIVE'
    }
  });

  const projInfra = await prisma.project.create({
    data: {
      name: 'Cloud Infrastructure & ISO 27001 Security',
      code: 'PRJ-INF-03',
      description: 'Zero-trust network architecture, rate limiting, and encrypted backups.',
      clientName: 'Internal Engineering',
      status: 'ACTIVE'
    }
  });

  const projAI = await prisma.project.create({
    data: {
      name: 'AI Productivity & Timesheet Analytics Engine',
      code: 'PRJ-AI-04',
      description: 'Automated anomaly detection in timesheets and workforce utilization models.',
      clientName: 'Nexus AI Ventures',
      status: 'ACTIVE'
    }
  });

  // 21. Seed Daily Work Timesheets & Productivity Logs
  await prisma.dailyTimesheet.createMany({
    data: [
      {
        userId: employeeRahul.id,
        logDate: '2026-09-18',
        projectId: projCore.id,
        taskTitle: 'Implemented End-of-Day Daily Timesheet Engine',
        activityDescription: 'Engineered REST endpoints with role scoping, Prisma schema relations, and client-side modal.',
        totalMinutes: 480, // 8 hours
        productiveMinutes: 450, // 7.5 hours (93.7% productive)
        activityType: 'DEVELOPMENT',
        isBillable: true,
        status: 'SUBMITTED'
      },
      {
        userId: employeeRahul.id,
        logDate: '2026-09-17',
        projectId: projInfra.id,
        taskTitle: 'Security Hardening & PasswordHash Leak Remediation',
        activityDescription: 'Sanitized User entity projections and enforced strict manager BOLA/IDOR middleware.',
        totalMinutes: 480,
        productiveMinutes: 430, // 7.16 hours (89.5% productive)
        activityType: 'CODE_REVIEW',
        isBillable: true,
        status: 'APPROVED',
        approvedById: managerUser.id
      },
      {
        userId: employeeAnanya.id,
        logDate: '2026-09-18',
        projectId: projMobile.id,
        taskTitle: 'Mobile Geofence Integration & VPN Token Handshake',
        activityDescription: 'Integrated location coordinates verification with office polygon bounds.',
        totalMinutes: 510, // 8.5 hours
        productiveMinutes: 480, // 8 hours (94.1% productive)
        activityType: 'DEVELOPMENT',
        isBillable: true,
        status: 'SUBMITTED'
      },
      {
        userId: employeeSneha.id,
        logDate: '2026-09-18',
        projectId: projAI.id,
        taskTitle: 'Dashboard Presence Hub & Celebrations Widget Design',
        activityDescription: 'Crafted dark mode tokens, birthday list widgets, and responsive micro-animations.',
        totalMinutes: 450, // 7.5 hours
        productiveMinutes: 410, // 6.8 hours (91.1% productive)
        activityType: 'DEVELOPMENT',
        isBillable: true,
        status: 'SUBMITTED'
      },
      {
        userId: employeeKaran.id,
        logDate: '2026-09-17',
        projectId: projCore.id,
        taskTitle: 'Full QA Regression & Automated Security Suite Runs',
        activityDescription: 'Authored 23 test specs verifying data leak fixes, holiday date checks, and break calculations.',
        totalMinutes: 480,
        productiveMinutes: 440, // 91.6% productive
        activityType: 'TESTING_QA',
        isBillable: true,
        status: 'APPROVED',
        approvedById: managerUser.id
      },
      {
        userId: managerUser.id,
        logDate: '2026-09-18',
        projectId: projCore.id,
        taskTitle: 'Sprint Planning & Team Roster Architecture Review',
        activityDescription: 'Assigned engineering deliverables, conducted 1:1 syncs, and reviewed pending PRs.',
        totalMinutes: 480,
        productiveMinutes: 420, // 87.5% productive
        activityType: 'MEETING',
        isBillable: false,
        status: 'APPROVED',
        approvedById: adminUser.id
      }
    ]
  });

  console.log('✅ Enterprise Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
