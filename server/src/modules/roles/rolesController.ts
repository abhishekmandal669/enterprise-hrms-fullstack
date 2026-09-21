import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate, requireRoles } from '../../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// 1. Get All System Roles with Permissions
router.get('/', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const roles = await prisma.role.findMany({
      include: {
        permissions: {
          include: {
            permission: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const formatted = roles.map(r => ({
      id: r.id,
      name: r.name,
      code: r.code,
      description: r.description,
      isSystem: r.isSystem,
      permissions: r.permissions.map(p => p.permission.key)
    }));

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Get All Permissions
router.get('/permissions', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const permissions = await prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { key: 'asc' }]
    });
    return res.json({ success: true, data: permissions });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Update Role Permissions (Dynamic RBAC Matrix)
router.put('/:id/permissions', authenticate, requireRoles('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { permissionKeys } = req.body;

    if (!Array.isArray(permissionKeys)) {
      return res.status(400).json({ success: false, message: 'permissionKeys must be an array of string keys.' });
    }

    const role = await prisma.role.findUnique({ where: { id } });
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found.' });
    }

    // Find all matching permissions in DB
    const permissions = await prisma.permission.findMany({
      where: { key: { in: permissionKeys } }
    });

    // Replace in transaction
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId: id } }),
      prisma.rolePermission.createMany({
        data: permissions.map(p => ({
          roleId: id,
          permissionId: p.id
        }))
      })
    ]);

    return res.json({
      success: true,
      message: `Permissions updated successfully for role ${role.name}.`,
      data: {
        roleId: id,
        permissionCount: permissions.length,
        permissions: permissions.map(p => p.key)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
