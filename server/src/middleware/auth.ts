import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface AuthScope {
  type: 'SELF' | 'TEAM' | 'ORG';
  userIds: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  reportingManagerId?: string | null;
  permissions?: string[];
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  scope?: AuthScope;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No bearer token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as any;
    req.user = decoded;

    // Check user active status in database to revoke suspended/exited sessions immediately
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { status: true }
    });

    if (!dbUser || ['SUSPENDED', 'TERMINATED', 'EXITED'].includes(dbUser.status)) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated, suspended, or exited. Access revoked.'
      });
    }

    // Resolve Scope automatically
    if (req.user) {
      if (['ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
        req.scope = { type: 'ORG', userIds: [] };
      } else if (req.user.role === 'MANAGER') {
        const reportees = await prisma.user.findMany({
          where: { reportingManagerId: req.user.id },
          select: { id: true }
        });
        const teamIds = [req.user.id, ...reportees.map(r => r.id)];
        req.scope = { type: 'TEAM', userIds: teamIds };
      } else {
        req.scope = { type: 'SELF', userIds: [req.user.id] };
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }
}

export function requireRoles(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires ${allowedRoles.join(' or ')} privileges.`
      });
    }
    next();
  };
}

export function requirePermission(permissionKey: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    // Super Admin has all access
    if (req.user.role === 'ADMIN') {
      return next();
    }

    try {
      // 1. Check user permission override
      const override = await prisma.userPermissionOverride.findUnique({
        where: {
          userId_permissionKey: {
            userId: req.user.id,
            permissionKey
          }
        }
      });

      if (override) {
        if (override.isGranted) return next();
        return res.status(403).json({ success: false, message: `Access Denied: Missing permission ${permissionKey}` });
      }

      // 2. Check role permissions
      const roleRecord = await prisma.role.findFirst({
        where: { code: req.user.role },
        include: {
          permissions: {
            include: { permission: true }
          }
        }
      });

      const hasPerm = roleRecord?.permissions.some(p => p.permission.key === permissionKey);
      if (hasPerm) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: `Access Denied: Your role (${req.user.role}) lacks required permission [${permissionKey}].`
      });
    } catch (err) {
      console.error('Permission check error:', err);
      return res.status(500).json({ success: false, message: 'Authorization validation failed.' });
    }
  };
}
