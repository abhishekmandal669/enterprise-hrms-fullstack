import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { config } from '../../config';
import { AuthRequest, authenticate } from '../../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// Helper to fetch consolidated permissions for a user
async function getUserPermissions(userId: string, roleCode: string): Promise<string[]> {
  if (roleCode === 'ADMIN') {
    const allPerms = await prisma.permission.findMany({ select: { key: true } });
    return allPerms.map(p => p.key);
  }

  const roleRecord = await prisma.role.findFirst({
    where: { code: roleCode },
    include: {
      permissions: {
        include: { permission: true }
      }
    }
  });

  const rolePerms = new Set(roleRecord?.permissions.map(p => p.permission.key) || []);

  const overrides = await prisma.userPermissionOverride.findMany({
    where: { userId }
  });

  for (const o of overrides) {
    if (o.isGranted) rolePerms.add(o.permissionKey);
    else rolePerms.delete(o.permissionKey);
  }

  return Array.from(rolePerms);
}

// -------------------------------------------------------------
// 1. Login (Login-Only Flow)
// -------------------------------------------------------------
router.post('/login', async (req, res) => {
  try {
    const { email, employeeCode, password, deviceInfo } = req.body;
    const identifier = (email || employeeCode || '').toLowerCase().trim();

    if (!identifier || !password) {
      return res.status(422).json({ success: false, message: 'Email/Employee code and password are required.' });
    }

    // Find user by email, officialEmail or employee code (supporting admin aliases)
    const orConditions: any[] = [
      { email: identifier },
      { officialEmail: identifier },
      { employeeCode: identifier.toUpperCase() }
    ];

    if (
      identifier === 'admin@nexus.com' ||
      identifier === 'admin@nexus.internal' ||
      identifier === 'vikramaditya.roy@nexus.com' ||
      identifier === 'admin'
    ) {
      orConditions.push({ role: 'ADMIN' });
    }

    const user = await prisma.user.findFirst({
      where: { OR: orConditions },
      include: { department: true }
    });

    // Enumeration Safe: Generic 401 if user not found
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email, employee code, or password. Please verify your credentials.' });
    }

    // Status Validations
    if (user.status === 'INVITED') {
      return res.status(403).json({
        success: false,
        message: 'Your account is invited. Please activate your account and set your password using your invite link.'
      });
    }

    if (['SUSPENDED', 'TERMINATED', 'EXITED'].includes(user.status)) {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status.toLowerCase()}. Please contact HR administration.`
      });
    }

    // Rate Limit Lockout Check (15 min lock after 5 failed attempts)
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const waitMins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      return res.status(429).json({
        success: false,
        message: `Account temporarily locked due to multiple failed attempts. Try again in ${waitMins} minute(s).`
      });
    }

    // Password Match
    if (!user.passwordHash) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const failed = (user.failedLoginAttempts || 0) + 1;
      const updateData: any = { failedLoginAttempts: failed };

      if (failed >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.'
      });
    }

    // Reset failed counter
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date()
      }
    });

    // Generate JWT Access & Refresh
    const permissions = await getUserPermissions(user.id, user.role);

    const payload = {
      id: user.id,
      email: user.email,
      officialEmail: user.officialEmail,
      role: user.role,
      name: `${user.firstName} ${user.lastName}`,
      reportingManagerId: user.reportingManagerId,
      permissions
    };

    const accessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user.id, jti: crypto.randomUUID() }, config.jwtSecret, { expiresIn: '7d' });

    // Record session
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: refreshHash,
        deviceInfo: JSON.stringify(deviceInfo || { userAgent: req.headers['user-agent'] }),
        ipAddress: ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    return res.json({
      success: true,
      accessToken,
      token: accessToken, // for backward compatibility
      refreshToken,
      user: {
        id: user.id,
        employeeCode: user.employeeCode,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        officialEmail: user.officialEmail,
        role: user.role,
        designation: user.designation,
        department: user.department?.name || 'General',
        avatarUrl: user.avatarUrl,
        shiftStartTime: user.shiftStartTime,
        shiftEndTime: user.shiftEndTime
      },
      permissions,
      flags: {
        mustChangePassword: user.mustChangePassword,
        profileCompleted: user.profileCompleted
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 1.1 Refresh Token Rotation
// -------------------------------------------------------------
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token is required.' });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, config.jwtSecret);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    const userId = decoded.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { department: true }
    });

    if (!user || ['SUSPENDED', 'TERMINATED', 'EXITED'].includes(user.status)) {
      return res.status(401).json({ success: false, message: 'User account is inactive or not found.' });
    }

    // Locate active session via SHA-256 hash of refresh token
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const matchedSession = await prisma.userSession.findFirst({
      where: {
        userId: user.id,
        refreshTokenHash: tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    if (!matchedSession) {
      return res.status(401).json({ success: false, message: 'Refresh token revoked or session not found.' });
    }

    // Invalidate old session (Token Rotation)
    await prisma.userSession.update({
      where: { id: matchedSession.id },
      data: { revokedAt: new Date() }
    });

    // Generate new Token Pair
    const permissions = await getUserPermissions(user.id, user.role);
    const payload = {
      id: user.id,
      email: user.email,
      officialEmail: user.officialEmail,
      role: user.role,
      name: `${user.firstName} ${user.lastName}`,
      reportingManagerId: user.reportingManagerId,
      permissions
    };

    const newAccessToken = jwt.sign(payload, config.jwtSecret, { expiresIn: '15m' });
    const newRefreshToken = jwt.sign({ id: user.id, jti: crypto.randomUUID() }, config.jwtSecret, { expiresIn: '7d' });

    const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: newHash,
        deviceInfo: matchedSession.deviceInfo,
        ipAddress: ip,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    return res.json({
      success: true,
      accessToken: newAccessToken,
      token: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 1.2 Logout & Session Revocation
// -------------------------------------------------------------
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      try {
        const decoded: any = jwt.verify(refreshToken, config.jwtSecret);
        if (decoded?.id) {
          const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
          await prisma.userSession.updateMany({
            where: { userId: decoded.id, refreshTokenHash: tokenHash, revokedAt: null },
            data: { revokedAt: new Date() }
          });
        }
      } catch (_) {}
    }

    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 2. Set Password (Invite Token Activation)
// -------------------------------------------------------------
router.post('/set-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) {
      return res.status(422).json({ success: false, message: 'Valid token and minimum 8-character password are required.' });
    }

    // Find active unexpired invite
    const invites = await prisma.userInvite.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });

    let matchedInvite = null;
    for (const inv of invites) {
      const match = await bcrypt.compare(token, inv.tokenHash);
      if (match) {
        matchedInvite = inv;
        break;
      }
    }

    if (!matchedInvite) {
      return res.status(400).json({
        success: false,
        message: 'Invite link is invalid or has expired. Please request a new invite from HR.'
      });
    }

    const newHash = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: matchedInvite.userId },
        data: {
          passwordHash: newHash,
          status: 'ACTIVE',
          emailVerifiedAt: new Date(),
          profileCompleted: true
        }
      }),
      prisma.userInvite.update({
        where: { id: matchedInvite.id },
        data: { usedAt: new Date() }
      })
    ]);

    return res.json({
      success: true,
      message: 'Password successfully set and account activated! You can now login.'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 3. Forgot Password (Enumeration Safe)
// -------------------------------------------------------------
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (email) {
      const cleanInput = email.toLowerCase().trim();
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: cleanInput },
            { officialEmail: cleanInput }
          ]
        }
      });

      if (user && user.status === 'ACTIVE') {
        const rawToken = `reset-${user.id}-${Date.now()}`;
        const hashed = await bcrypt.hash(rawToken, 10);
        await prisma.passwordReset.create({
          data: {
            userId: user.id,
            tokenHash: hashed,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 min
          }
        });
      }
    }

    return res.json({
      success: true,
      message: 'If the account exists, password reset instructions have been dispatched.'
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 4. Reset Password
// -------------------------------------------------------------
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(422).json({ success: false, message: 'Valid token and minimum 8-character password are required.' });
    }

    const resets = await prisma.passwordReset.findMany({
      where: {
        usedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    let matchedReset = null;
    for (const r of resets) {
      const match = await bcrypt.compare(token, r.tokenHash);
      if (match) {
        matchedReset = r;
        break;
      }
    }

    if (!matchedReset) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or expired.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: matchedReset.userId },
        data: { passwordHash: newHash }
      }),
      prisma.passwordReset.update({
        where: { id: matchedReset.id },
        data: { usedAt: new Date() }
      }),
      // Revoke all existing sessions
      prisma.userSession.updateMany({
        where: { userId: matchedReset.userId },
        data: { revokedAt: new Date() }
      })
    ]);

    return res.json({ success: true, message: 'Password reset successfully. Please login with your new password.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 5. Change Password (Authenticated)
// -------------------------------------------------------------
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword || newPassword.length < 8) {
      return res.status(422).json({ success: false, message: 'Old and new passwords (min 8 chars) are required.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user?.id } });
    if (!user || !user.passwordHash) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const match = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Current password does not match.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash, mustChangePassword: false }
    });

    return res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 6. Get Active Sessions
// -------------------------------------------------------------
router.get('/sessions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const sessions = await prisma.userSession.findMany({
      where: {
        userId: req.user?.id,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      },
      orderBy: { lastActiveAt: 'desc' }
    });

    return res.json({ success: true, data: sessions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 7. Revoke Session
// -------------------------------------------------------------
router.post('/sessions/:id/revoke', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.userSession.updateMany({
      where: {
        id: req.params.id,
        userId: req.user?.id
      },
      data: { revokedAt: new Date() }
    });

    return res.json({ success: true, message: 'Session revoked successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 8. Get Current Authenticated User (Me)
// -------------------------------------------------------------
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      include: {
        department: true,
        reportingManager: {
          select: { id: true, firstName: true, lastName: true, email: true, designation: true }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const permissions = await getUserPermissions(user.id, user.role);

    return res.json({
      success: true,
      user: {
        id: user.id,
        employeeCode: user.employeeCode,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        officialEmail: user.officialEmail,
        role: user.role,
        designation: user.designation,
        department: user.department?.name || 'General',
        reportingManager: user.reportingManager ? `${user.reportingManager.firstName} ${user.reportingManager.lastName}` : null,
        avatarUrl: user.avatarUrl,
        shiftStartTime: user.shiftStartTime,
        shiftEndTime: user.shiftEndTime
      },
      permissions,
      flags: {
        mustChangePassword: user.mustChangePassword,
        profileCompleted: user.profileCompleted
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// -------------------------------------------------------------
// 9. Quick Role Switch (For Demo & Multi-Perspective Testing)
// -------------------------------------------------------------
router.post('/switch-perspective', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Quick role switching is strictly disabled in production environments.'
      });
    }

    const { role } = req.body;
    const targetUser = await prisma.user.findFirst({
      where: { role: (role || 'ADMIN').toUpperCase(), status: 'ACTIVE' },
      include: { department: true }
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'Role user not found' });
    }

    const permissions = await getUserPermissions(targetUser.id, targetUser.role);

    const payload = {
      id: targetUser.id,
      email: targetUser.email,
      officialEmail: targetUser.officialEmail,
      role: targetUser.role,
      name: `${targetUser.firstName} ${targetUser.lastName}`,
      reportingManagerId: targetUser.reportingManagerId,
      permissions
    };

    const token = jwt.sign(payload, config.jwtSecret, { expiresIn: '7d' });

    return res.json({
      success: true,
      token,
      accessToken: token,
      user: {
        id: targetUser.id,
        employeeCode: targetUser.employeeCode,
        name: `${targetUser.firstName} ${targetUser.lastName}`,
        email: targetUser.email,
        officialEmail: targetUser.officialEmail,
        role: targetUser.role,
        designation: targetUser.designation,
        department: targetUser.department?.name || 'General',
        avatarUrl: targetUser.avatarUrl,
        shiftStartTime: targetUser.shiftStartTime,
        shiftEndTime: targetUser.shiftEndTime
      },
      permissions,
      flags: {
        mustChangePassword: targetUser.mustChangePassword,
        profileCompleted: targetUser.profileCompleted
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
