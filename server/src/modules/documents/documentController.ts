import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { uploadDocumentMiddleware } from '../../services/uploadService';

const prisma = new PrismaClient();
const router = Router();

// 1. Get All Documents (Scoped with Search, Filter & Pagination)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { category, search, userId, page = '1', pageSize = '10' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(pageSize) || 10));
    const skip = (pageNum - 1) * limit;

    const where: any = {};

    // Role-based Access Scoping
    if (user.role === 'ADMIN' || user.role === 'HR_ADMIN' || user.role === 'SUPER_ADMIN') {
      if (userId) where.userId = userId;
    } else if (user.role === 'MANAGER') {
      if (userId && userId !== user.id) {
        // Manager can only view reportees
        const reportees = await prisma.user.findMany({
          where: { reportingManagerId: user.id },
          select: { id: true }
        });
        const reporteeIds = reportees.map(r => r.id);
        if (!reporteeIds.includes(userId)) {
          return res.status(403).json({ success: false, message: 'Unauthorized to view documents for this employee.' });
        }
        where.userId = userId;
      } else {
        // Default: view own + direct reportees
        const reportees = await prisma.user.findMany({
          where: { reportingManagerId: user.id },
          select: { id: true }
        });
        const allowedIds = [user.id, ...reportees.map(r => r.id)];
        where.userId = { in: allowedIds };
      }
    } else {
      // Standard employee can only see their own documents
      where.userId = user.id;
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim() } },
        { fileName: { contains: search.trim() } },
        { user: { firstName: { contains: search.trim() } } },
        { user: { lastName: { contains: search.trim() } } },
        { user: { employeeCode: { contains: search.trim() } } }
      ];
    }

    const [total, documents] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
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
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    return res.json({
      success: true,
      data: documents,
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

// 2. Upload Document
router.post('/upload', authenticate, uploadDocumentMiddleware.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const { title, category = 'OTHER', targetUserId } = req.body;

    let docUserId = user.id;
    if (targetUserId && targetUserId !== user.id) {
      if (user.role !== 'ADMIN' && user.role !== 'HR_ADMIN' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ success: false, message: 'Only HR / Admins can upload documents for other employees.' });
      }
      docUserId = targetUserId;
    }

    const fileUrl = `/uploads/documents/${req.file.filename}`;

    const doc = await prisma.document.create({
      data: {
        userId: docUserId,
        title: title?.trim() || req.file.originalname,
        category,
        fileName: req.file.originalname,
        fileUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedById: user.id,
        status: 'VERIFIED'
      },
      include: {
        user: {
          select: {
            id: true,
            employeeCode: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully.',
      data: doc
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Delete Document
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;

    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    // Permission check: owner or HR Admin / Super Admin
    if (doc.userId !== user.id && !['ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this document.' });
    }

    // Delete file from disk if exists
    const diskPath = path.join(process.cwd(), doc.fileUrl.replace(/^\//, ''));
    if (fs.existsSync(diskPath)) {
      try {
        fs.unlinkSync(diskPath);
      } catch (err) {
        console.warn('Could not unlink disk file:', diskPath);
      }
    }

    await prisma.document.delete({ where: { id } });

    return res.json({ success: true, message: 'Document deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
