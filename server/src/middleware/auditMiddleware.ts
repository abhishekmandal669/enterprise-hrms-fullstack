import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth';

const prisma = new PrismaClient();

export function auditLogger(action: string, resourceType: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    // Intercept finish to log successful mutations
    res.on('finish', async () => {
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        try {
          const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
          const resourceId = (req.params?.id as string) || (req.body?.id as string) || undefined;
          
          await prisma.auditLog.create({
            data: {
              actorId: req.user.id,
              action,
              resourceType,
              resourceId,
              ipAddress: ip,
              metaDetails: JSON.stringify({
                path: req.originalUrl,
                method: req.method,
                timestamp: new Date().toISOString()
              })
            }
          });
        } catch (err) {
          console.error('Failed to write audit log:', err);
        }
      }
    });

    next();
  };
}
