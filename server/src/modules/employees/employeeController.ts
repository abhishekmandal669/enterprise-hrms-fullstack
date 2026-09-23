import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate, requirePermission } from '../../middleware/auth';
import { auditLogger } from '../../middleware/auditMiddleware';
import { EmailService } from '../../services/emailService';
import { InternalMailService } from '../../services/internalMailService';

const prisma = new PrismaClient();
const router = Router();

// Helper to generate a secure random invite token
function generateInviteToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

// -------------------------------------------------------------
// 0. Consolidated Dropdowns (Alias to Master Data for compatibility)
// -------------------------------------------------------------
router.get('/dropdowns', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [departments, leaveTypes, shifts, masterData, managers] = await prisma.$transaction([
      prisma.department.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.leaveType.findMany({ orderBy: { name: 'asc' } }),
      prisma.shift.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
      prisma.masterData.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.user.findMany({
        where: { role: { in: ['MANAGER', 'ADMIN', 'HR_ADMIN'] }, status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true, role: true, designation: true }
      })
    ]);

    const designations = masterData.filter(m => m.category === 'DESIGNATION');
    const workModes = masterData.filter(m => m.category === 'WORK_MODE');

    return res.json({
      success: true,
      data: {
        departments,
        leaveTypes,
        shifts,
        designations: designations.map(d => ({ key: d.key, label: d.label })),
        workModes: workModes.map(w => ({ key: w.key, label: w.label })),
        managers: managers.map(m => ({ id: m.id, name: `${m.firstName} ${m.lastName} (${m.role})` }))
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 0.1 Read-Only Company Directory & Org Hierarchy (Public Read for Authenticated Users)
// -------------------------------------------------------------
router.get('/directory', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { search, departmentId } = req.query;

    const where: any = {
      status: 'ACTIVE'
    };

    if (search) {
      const q = (search as string).toLowerCase().trim();
      where.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { email: { contains: q } },
        { designation: { contains: q } },
        { employeeCode: { contains: q } }
      ];
    }

    if (departmentId) {
      where.departmentId = String(departmentId);
    }

    const employees = await prisma.user.findMany({
      where,
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        designation: true,
        avatarUrl: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        reportingManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            designation: true,
            avatarUrl: true
          }
        }
      },
      orderBy: [
        { firstName: 'asc' }
      ]
    });

    return res.json({
      success: true,
      data: employees
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 1. List Employees (Paginated & Filterable)
// -------------------------------------------------------------
router.get('/', authenticate, requirePermission('employee.create'), async (req: AuthRequest, res: Response) => {
  try {
    const { search, departmentId, status, role, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const take = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * take;

    const where: any = {};

    if (search) {
      const q = (search as string).toLowerCase().trim();
      where.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { email: { contains: q } },
        { employeeCode: { contains: q } }
      ];
    }

    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;
    if (role) where.role = role;

    const [total, employees] = await prisma.$transaction([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take,
        include: {
          department: true,
          reportingManager: {
            select: { id: true, firstName: true, lastName: true, employeeCode: true }
          },
          invitesReceived: {
            where: { usedAt: null, expiresAt: { gt: new Date() } },
            take: 1
          }
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return res.json({
      success: true,
      data: employees.map(emp => ({
        id: emp.id,
        employeeCode: emp.employeeCode,
        name: `${emp.firstName} ${emp.lastName}`,
        email: emp.email,
        role: emp.role,
        status: emp.status,
        designation: emp.designation,
        department: emp.department?.name || 'Unassigned',
        departmentId: emp.departmentId,
        reportingManager: emp.reportingManager ? `${emp.reportingManager.firstName} ${emp.reportingManager.lastName}` : 'None',
        reportingManagerId: emp.reportingManagerId,
        hasPendingInvite: emp.invitesReceived.length > 0,
        createdAt: emp.createdAt
      })),
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 2. Add Employee (Creates INVITED user & Invite Token)
// -------------------------------------------------------------
router.post(
  '/',
  authenticate,
  requirePermission('employee.create'),
  auditLogger('EMPLOYEE_CREATE', 'USER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const {
        employeeCode,
        firstName,
        lastName,
        email,
        role = 'EMPLOYEE',
        designation,
        departmentId,
        reportingManagerId,
        shiftStartTime = '09:00',
        shiftEndTime = '18:00'
      } = req.body;

      if (!firstName || !lastName || !email || !designation) {
        return res.status(422).json({ success: false, message: 'First name, last name, email, and designation are required.' });
      }

      // Unique checks
      const cleanEmail = email.toLowerCase().trim();
      const code = employeeCode || `LEX-${Math.floor(100 + Math.random() * 900)}`;

      const existing = await prisma.user.findFirst({
        where: {
          OR: [{ email: cleanEmail }, { employeeCode: code }]
        }
      });

      if (existing) {
        return res.status(409).json({ success: false, message: 'Employee with this email or employee code already exists.' });
      }

      // Hierarchy cycle check: manager cannot be self
      if (reportingManagerId) {
        const mgr = await prisma.user.findUnique({ where: { id: reportingManagerId } });
        if (!mgr) {
          return res.status(400).json({ success: false, message: 'Specified reporting manager not found.' });
        }
      }

      // Auto-generate unique official company email
      const officialEmail = await InternalMailService.generateOfficialEmail(firstName, lastName);

      // Create User with INVITED status
      const newUser = await prisma.user.create({
        data: {
          employeeCode: code,
          firstName,
          lastName,
          email: cleanEmail,
          officialEmail,
          passwordHash: null,
          role,
          status: 'INVITED',
          profileCompleted: false,
          designation,
          departmentId: departmentId || null,
          reportingManagerId: reportingManagerId || null,
          shiftStartTime,
          shiftEndTime
        }
      });

      // Generate 72-hour invite token
      const rawToken = generateInviteToken();
      const hashedToken = await bcrypt.hash(rawToken, 10);
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

      await prisma.userInvite.create({
        data: {
          userId: newUser.id,
          tokenHash: hashedToken,
          invitedById: req.user?.id,
          expiresAt
        }
      });

      // Dispatch 72-hour onboarding invitation email (ISSUE-013 & ISSUE-035)
      await EmailService.sendEmployeeInvitation(
        newUser.email,
        `${newUser.firstName} ${newUser.lastName}`,
        rawToken
      );

      // Dispatch automated Welcome internal email to their new Webmail inbox
      await InternalMailService.sendSystemEmail(
        newUser.id,
        'Welcome to Lexvera Enterprise HRMS!',
        `<p>Dear ${newUser.firstName},</p>
         <p>Welcome to the team! Your official corporate email has been activated: <code>${officialEmail}</code>.</p>
         <p>You can use the built-in <strong>Company Webmail</strong> in the sidebar to communicate with your team members, managers, and HR administration.</p>
         <p>Best regards,<br/><strong>HR Operations & Administration</strong></p>`,
        'GENERAL'
      );

      // Allocate standard leave quotas for current year
      const leaveTypes = await prisma.leaveType.findMany();
      for (const lt of leaveTypes) {
        await prisma.leaveBalance.create({
          data: {
            userId: newUser.id,
            leaveTypeId: lt.id,
            year: new Date().getFullYear(),
            totalAllocated: lt.annualQuota,
            used: 0,
            pendingApproval: 0
          }
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Employee onboarded successfully. Invite token generated.',
        data: {
          id: newUser.id,
          employeeCode: newUser.employeeCode,
          name: `${newUser.firstName} ${newUser.lastName}`,
          email: newUser.email,
          officialEmail: newUser.officialEmail,
          role: newUser.role,
          status: newUser.status,
          inviteToken: rawToken,
          inviteLink: `/set-password?token=${rawToken}`,
          expiresAt
        }
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// -------------------------------------------------------------
// 3. Resend Invite Token
// -------------------------------------------------------------
router.post(
  '/resend-invite',
  authenticate,
  requirePermission('employee.create'),
  auditLogger('INVITE_RESEND', 'USER_INVITE'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required.' });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      // Expire previous invites
      await prisma.userInvite.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() }
      });

      // Generate new token
      const rawToken = generateInviteToken();
      const hashedToken = await bcrypt.hash(rawToken, 10);
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

      await prisma.userInvite.create({
        data: {
          userId,
          tokenHash: hashedToken,
          invitedById: req.user?.id,
          expiresAt
        }
      });

      // Dispatch 72-hour onboarding invitation email (ISSUE-013 & ISSUE-035)
      await EmailService.sendEmployeeInvitation(
        user.email,
        `${user.firstName} ${user.lastName}`,
        rawToken
      );

      return res.json({
        success: true,
        message: 'New invite token issued (valid for 72 hours).',
        data: {
          userId,
          inviteToken: rawToken,
          inviteLink: `/set-password?token=${rawToken}`,
          expiresAt
        }
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// -------------------------------------------------------------
// 4. Bulk CSV Import (Validation + Atomic Commit)
// -------------------------------------------------------------
router.post(
  '/bulk-import',
  authenticate,
  requirePermission('employee.bulk_import'),
  auditLogger('EMPLOYEE_BULK_IMPORT', 'USER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { rows } = req.body; // Array of employee objects from parsed CSV
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(422).json({ success: false, message: 'Valid non-empty CSV rows array required.' });
      }

      const errors: Array<{ row: number; email: string; reason: string }> = [];
      const validRows: any[] = [];
      const leaveTypes = await prisma.leaveType.findMany();

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const rowNum = i + 1;

        if (!r.firstName || !r.lastName || !r.email || !r.designation) {
          errors.push({ row: rowNum, email: r.email || 'N/A', reason: 'Missing required fields (firstName, lastName, email, designation).' });
          continue;
        }

        const email = r.email.toLowerCase().trim();
        const existing = await prisma.user.findFirst({
          where: { OR: [{ email }, { employeeCode: r.employeeCode || '' }] }
        });

        if (existing) {
          errors.push({ row: rowNum, email, reason: 'Duplicate email or employee code already exists in database.' });
          continue;
        }

        const sanitizeStr = (str: string) => {
          if (!str) return '';
          const trimmed = str.trim();
          return /^[=+\-@]/.test(trimmed) ? `'${trimmed}` : trimmed;
        };

        const fName = sanitizeStr(r.firstName);
        const lName = sanitizeStr(r.lastName);
        const officialEmail = await InternalMailService.generateOfficialEmail(fName, lName);

        validRows.push({
          employeeCode: sanitizeStr(r.employeeCode) || `LEX-${Math.floor(200 + Math.random() * 800)}`,
          firstName: fName,
          lastName: lName,
          email,
          officialEmail,
          role: r.role || 'EMPLOYEE',
          status: 'INVITED',
          designation: sanitizeStr(r.designation),
          shiftStartTime: r.shiftStartTime || '09:00',
          shiftEndTime: r.shiftEndTime || '18:00'
        });
      }

      // Insert all valid rows inside isolated atomic transactions
      const importedUsers: any[] = [];
      for (const item of validRows) {
        const rawToken = generateInviteToken();
        const hashed = await bcrypt.hash(rawToken, 10);
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

        const user = await prisma.$transaction(async (tx) => {
          const createdUser = await tx.user.create({ data: item });

          await tx.userInvite.create({
            data: {
              userId: createdUser.id,
              tokenHash: hashed,
              invitedById: req.user?.id,
              expiresAt
            }
          });

          for (const lt of leaveTypes) {
            await tx.leaveBalance.create({
              data: {
                userId: createdUser.id,
                leaveTypeId: lt.id,
                year: new Date().getFullYear(),
                totalAllocated: lt.annualQuota,
                used: 0,
                pendingApproval: 0
              }
            });
          }

          return createdUser;
        });

        // Dispatch Welcome internal email to their Webmail inbox
        await InternalMailService.sendSystemEmail(
          user.id,
          'Welcome to Lexvera Enterprise HRMS!',
          `<p>Dear ${user.firstName},</p>
           <p>Welcome aboard! Your official company email account is <code>${user.officialEmail}</code>.</p>
           <p>Access your Company Webmail from the portal sidebar to communicate with colleagues.</p>`,
          'GENERAL'
        );

        importedUsers.push({
          id: user.id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          officialEmail: user.officialEmail,
          inviteToken: rawToken
        });
      }

      return res.json({
        success: true,
        message: `Processed ${rows.length} records. Imported ${importedUsers.length} employees with invites issued.`,
        importedCount: importedUsers.length,
        failedCount: errors.length,
        errors,
        importedUsers
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// -------------------------------------------------------------
// 5. Update Status (Suspend, Activate, Exit)
// -------------------------------------------------------------
router.patch(
  '/:id/status',
  authenticate,
  requirePermission('employee.manage.status'),
  auditLogger('EMPLOYEE_STATUS_UPDATE', 'USER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      const validStatuses = ['ACTIVE', 'PROBATION', 'SUSPENDED', 'RESIGNED', 'TERMINATED', 'EXITED'];
      if (!validStatuses.includes(status)) {
        return res.status(422).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }

      const updateData: any = { status };
      if (['TERMINATED', 'EXITED', 'SUSPENDED'].includes(status)) {
        updateData.deactivatedAt = new Date();
      } else if (status === 'ACTIVE') {
        updateData.deactivatedAt = null;
      }

      const updated = await prisma.user.update({
        where: { id },
        data: updateData
      });

      // Sanitize sensitive fields before returning
      const { passwordHash, twoFactorSecret, ...safeUser } = updated;

      return res.json({
        success: true,
        message: `Employee status updated to ${status}.`,
        data: safeUser
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
);

// -------------------------------------------------------------
// 6. Get 360° Employee Details (Profile, Timesheets, Tasks, Attendance, Leaves)
// -------------------------------------------------------------
router.get('/:id/360', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const callerId = req.user?.id!;
    const callerRole = req.user?.role!;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
        reportingManager: {
          select: { id: true, firstName: true, lastName: true, email: true, designation: true }
        },
        reportees: {
          select: { id: true, firstName: true, lastName: true, designation: true, avatarUrl: true, status: true }
        },
        dailyTimesheets: {
          include: { project: true, approvedBy: { select: { firstName: true, lastName: true } } },
          orderBy: { logDate: 'desc' },
          take: 30
        },
        assignedTasks: {
          include: { createdBy: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' },
          take: 30
        },
        attendances: {
          include: { breaks: true },
          orderBy: { attendanceDate: 'desc' },
          take: 30
        },
        leaveBalances: {
          include: { leaveType: true }
        },
        leaveRequests: {
          include: { leaveType: true, approvedBy: { select: { firstName: true, lastName: true } } },
          orderBy: { fromDate: 'desc' },
          take: 20
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }

    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN'].includes(callerRole);
    const isDirectManager = callerRole === 'MANAGER' && user.reportingManagerId === callerId;
    const isSelf = user.id === callerId;

    if (!isAdmin && !isDirectManager && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to view this employee 360 profile.'
      });
    }

    // Compute productivity summary metrics
    const totalMinutesLogged = user.dailyTimesheets.reduce((acc, t) => acc + t.totalMinutes, 0);
    const totalProductiveMinutes = user.dailyTimesheets.reduce((acc, t) => acc + t.productiveMinutes, 0);
    const avgProductivity = totalMinutesLogged > 0 ? Math.round((totalProductiveMinutes / totalMinutesLogged) * 100) : 0;

    // Sanitize user profile fields
    const { passwordHash, twoFactorSecret, ...safeProfile } = user;

    return res.json({
      success: true,
      data: {
        profile: safeProfile,
        metrics: {
          totalLoggedHours: Number((totalMinutesLogged / 60).toFixed(1)),
          totalProductiveHours: Number((totalProductiveMinutes / 60).toFixed(1)),
          avgProductivityPercent: avgProductivity,
          totalTasksAssigned: user.assignedTasks.length,
          completedTasks: user.assignedTasks.filter(t => t.status === 'DONE').length,
          pendingTasks: user.assignedTasks.filter(t => t.status !== 'DONE').length,
          attendanceDays: user.attendances.length
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 7. Get Current User's Profile (Self Service & Team Hierarchy)
// -------------------------------------------------------------
router.get('/profile/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        reportingManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            designation: true,
            employeeCode: true,
            avatarUrl: true,
            role: true,
            phone: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Fetch team peers (colleagues reporting to same manager or department)
    let teamMembers: any[] = [];
    if (user.reportingManagerId) {
      teamMembers = await prisma.user.findMany({
        where: {
          reportingManagerId: user.reportingManagerId,
          id: { not: user.id },
          status: 'ACTIVE'
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          designation: true,
          employeeCode: true,
          avatarUrl: true,
          email: true,
          role: true
        }
      });
    } else if (user.departmentId) {
      teamMembers = await prisma.user.findMany({
        where: {
          departmentId: user.departmentId,
          id: { not: user.id },
          status: 'ACTIVE'
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          designation: true,
          employeeCode: true,
          avatarUrl: true,
          email: true,
          role: true
        },
        take: 8
      });
    }

    // Fetch direct reportees (if user is a manager/team lead)
    const reportees = await prisma.user.findMany({
      where: { reportingManagerId: user.id, status: 'ACTIVE' },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        designation: true,
        employeeCode: true,
        avatarUrl: true,
        email: true,
        role: true
      }
    });

    // Parse emergency contact if stored as "Name | Phone"
    let emergencyContactName = '';
    let emergencyContactPhone = '';
    if (user.emergencyContact) {
      if (user.emergencyContact.includes('|')) {
        const parts = user.emergencyContact.split('|');
        emergencyContactName = parts[0]?.trim() || '';
        emergencyContactPhone = parts[1]?.trim() || '';
      } else {
        emergencyContactName = user.emergencyContact;
      }
    }

    const { passwordHash, twoFactorSecret, ...safeProfile } = user;

    return res.json({
      success: true,
      data: {
        ...safeProfile,
        joiningDate: user.joiningDate || (user.createdAt ? user.createdAt.toISOString().split('T')[0] : '2026-01-15'),
        emergencyContactName,
        emergencyContactPhone,
        teamMembers,
        reportees,
        permissions: req.user?.permissions || []
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 8. Update Current User's Profile (Personal & Emergency Info)
// -------------------------------------------------------------
router.put('/profile/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;
    const { phone, emergencyContactName, emergencyContactPhone, address, dateOfBirth } = req.body;

    const emergencyContactFormatted = (emergencyContactName || emergencyContactPhone)
      ? `${(emergencyContactName || '').trim()} | ${(emergencyContactPhone || '').trim()}`
      : undefined;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        phone: phone !== undefined ? String(phone).trim() : undefined,
        address: address !== undefined ? String(address).trim() : undefined,
        dateOfBirth: dateOfBirth !== undefined ? String(dateOfBirth).trim() : undefined,
        emergencyContact: emergencyContactFormatted,
        profileCompleted: true
      },
      include: {
        department: true,
        reportingManager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            designation: true,
            employeeCode: true,
            avatarUrl: true,
            role: true
          }
        }
      }
    });

    const { passwordHash, twoFactorSecret, ...safeUser } = updated;
    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      data: {
        ...safeUser,
        emergencyContactName: emergencyContactName || '',
        emergencyContactPhone: emergencyContactPhone || ''
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
