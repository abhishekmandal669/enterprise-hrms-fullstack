import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate, requireRoles } from '../../middleware/auth';

const prisma = new PrismaClient();
const router = Router();

// 1. Get Asset KPI Statistics
router.get('/stats', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const [total, available, assigned, underRepair, retired] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.count({ where: { status: 'AVAILABLE' } }),
      prisma.asset.count({ where: { status: 'ASSIGNED' } }),
      prisma.asset.count({ where: { status: 'UNDER_REPAIR' } }),
      prisma.asset.count({ where: { status: 'RETIRED' } })
    ]);

    return res.json({
      success: true,
      data: {
        total,
        available,
        assigned,
        underRepair,
        retired
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Get Employee's Currently Assigned Assets
router.get('/my-assets', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const assignments = await prisma.assetAssignment.findMany({
      where: {
        userId,
        status: 'ACTIVE'
      },
      include: {
        asset: true
      },
      orderBy: { assignedDate: 'desc' }
    });

    return res.json({ success: true, data: assignments });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. List All Assets with Filters & Pagination (10, 25, 50, 100)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { category, status, search, page = '1', pageSize = '10' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize) || 10));
    const skip = (pageNum - 1) * limit;

    const where: any = {};

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search && search.trim()) {
      where.OR = [
        { assetCode: { contains: search.trim() } },
        { name: { contains: search.trim() } },
        { brand: { contains: search.trim() } },
        { modelNumber: { contains: search.trim() } },
        { serialNumber: { contains: search.trim() } }
      ];
    }

    const [total, assets] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        include: {
          assignments: {
            where: { status: 'ACTIVE' },
            include: {
              user: {
                select: {
                  id: true,
                  employeeCode: true,
                  firstName: true,
                  lastName: true,
                  designation: true,
                  department: { select: { name: true } }
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    return res.json({
      success: true,
      data: assets,
      pagination: {
        total,
        page: pageNum,
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Create New Asset
router.post('/', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      category = 'LAPTOP',
      brand,
      modelNumber,
      serialNumber,
      purchaseDate,
      purchaseCost,
      warrantyExpiry,
      condition = 'NEW',
      status = 'AVAILABLE'
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Asset name is required.' });
    }

    // Auto-generate unique asset code if not passed
    const prefix = category.substring(0, 3).toUpperCase();
    const count = await prisma.asset.count();
    const assetCode = `AST-${prefix}-${String(count + 1).padStart(4, '0')}`;

    const asset = await prisma.asset.create({
      data: {
        assetCode,
        name: name.trim(),
        category,
        brand: brand?.trim() || null,
        modelNumber: modelNumber?.trim() || null,
        serialNumber: serialNumber?.trim() || null,
        purchaseDate: purchaseDate || null,
        purchaseCost: purchaseCost ? parseFloat(purchaseCost) : null,
        warrantyExpiry: warrantyExpiry || null,
        condition,
        status
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Asset created successfully.',
      data: asset
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Update Asset
router.put('/:id', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      brand,
      modelNumber,
      serialNumber,
      purchaseDate,
      purchaseCost,
      warrantyExpiry,
      condition,
      status
    } = req.body;

    const updated = await prisma.asset.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(category && { category }),
        ...(brand !== undefined && { brand: brand?.trim() || null }),
        ...(modelNumber !== undefined && { modelNumber: modelNumber?.trim() || null }),
        ...(serialNumber !== undefined && { serialNumber: serialNumber?.trim() || null }),
        ...(purchaseDate !== undefined && { purchaseDate }),
        ...(purchaseCost !== undefined && { purchaseCost: purchaseCost ? parseFloat(purchaseCost) : null }),
        ...(warrantyExpiry !== undefined && { warrantyExpiry }),
        ...(condition && { condition }),
        ...(status && { status })
      }
    });

    return res.json({ success: true, message: 'Asset updated successfully.', data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 6. Assign Asset to Employee
router.post('/:id/assign', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, assignedDate, conditionOnAssign = 'GOOD', notes } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Assignee employee is required.' });
    }

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { assignments: { where: { status: 'ACTIVE' } } }
    });

    if (!asset) {
      return res.status(404).json({ success: false, message: 'Asset not found.' });
    }

    if (asset.assignments.length > 0) {
      return res.status(400).json({ success: false, message: 'Asset is already actively assigned to an employee.' });
    }

    // Create assignment and update asset status
    const [assignment, updatedAsset] = await prisma.$transaction([
      prisma.assetAssignment.create({
        data: {
          assetId: id,
          userId,
          assignedDate: assignedDate || new Date().toISOString().split('T')[0],
          conditionOnAssign,
          assignedById: req.user!.id,
          notes: notes?.trim() || null,
          status: 'ACTIVE'
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeCode: true
            }
          }
        }
      }),
      prisma.asset.update({
        where: { id },
        data: {
          status: 'ASSIGNED',
          condition: conditionOnAssign
        }
      })
    ]);

    return res.json({
      success: true,
      message: 'Asset assigned successfully.',
      data: { assignment, asset: updatedAsset }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 7. Return Asset
router.post('/:id/return', authenticate, requireRoles('ADMIN', 'HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { returnDate, conditionOnReturn = 'GOOD', notes } = req.body;

    const activeAssignment = await prisma.assetAssignment.findFirst({
      where: {
        assetId: id,
        status: 'ACTIVE'
      }
    });

    if (!activeAssignment) {
      return res.status(400).json({ success: false, message: 'No active assignment found for this asset.' });
    }

    const newStatus = conditionOnReturn === 'DAMAGED' ? 'UNDER_REPAIR' : 'AVAILABLE';

    await prisma.$transaction([
      prisma.assetAssignment.update({
        where: { id: activeAssignment.id },
        data: {
          status: 'RETURNED',
          returnDate: returnDate || new Date().toISOString().split('T')[0],
          conditionOnReturn,
          notes: notes ? `${activeAssignment.notes ? activeAssignment.notes + ' | ' : ''}Return Note: ${notes}` : activeAssignment.notes
        }
      }),
      prisma.asset.update({
        where: { id },
        data: {
          status: newStatus,
          condition: conditionOnReturn
        }
      })
    ]);

    return res.json({
      success: true,
      message: `Asset returned successfully and marked as ${newStatus}.`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 8. Delete Asset
router.delete('/:id', authenticate, requireRoles('ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.asset.delete({ where: { id } });
    return res.json({ success: true, message: 'Asset deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
