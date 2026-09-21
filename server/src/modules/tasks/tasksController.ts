import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest, authenticate } from '../../middleware/auth';
import { eventBus, DomainEvents } from '../../events/eventBus';

const prisma = new PrismaClient();
const router = Router();

// 1. Create or Assign Task (Supports Multi-Assignees & Project Association)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const creatorId = req.user?.id!;
    const creatorRole = req.user?.role!;
    const { title, description, assignedToId, assignedUserIds, projectId, priority, dueDate } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Task title is required.' });
    }

    // Determine target assignee list
    let targetIds: string[] = [];
    if (Array.isArray(assignedUserIds) && assignedUserIds.length > 0) {
      targetIds = Array.from(new Set(assignedUserIds.map((id: string) => String(id).trim())));
    } else if (assignedToId) {
      targetIds = [String(assignedToId).trim()];
    } else {
      targetIds = [creatorId];
    }

    // Role Scoping Enforcement:
    // - Employee: Can only assign to self
    // - Manager: Can assign to self or direct reportees
    // - Admin: Can assign to anyone
    if (creatorRole === 'EMPLOYEE') {
      const hasOther = targetIds.some(id => id !== creatorId);
      if (hasOther) {
        return res.status(403).json({
          success: false,
          message: 'Employees can only create personal tasks for themselves.'
        });
      }
    }

    if (creatorRole === 'MANAGER') {
      const otherIds = targetIds.filter(id => id !== creatorId);
      if (otherIds.length > 0) {
        const teamMembers = await prisma.user.findMany({
          where: { id: { in: otherIds }, reportingManagerId: creatorId },
          select: { id: true }
        });
        const validIds = new Set(teamMembers.map(m => m.id));
        const invalidIds = otherIds.filter(id => !validIds.has(id));
        if (invalidIds.length > 0) {
          return res.status(403).json({
            success: false,
            message: 'Managers can only assign tasks to their own direct reporting team members.'
          });
        }
      }
    }

    const primaryAssigneeId = targetIds[0] || creatorId;

    const task = await prisma.task.create({
      data: {
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        projectId: projectId ? String(projectId).trim() : null,
        createdById: creatorId,
        assignedToId: primaryAssigneeId,
        priority: priority || 'MEDIUM',
        status: 'TODO',
        dueDate: dueDate || null,
        assignees: {
          create: targetIds.map(uId => ({
            userId: uId,
            role: uId === primaryAssigneeId ? 'LEAD' : 'CONTRIBUTOR'
          }))
        }
      },
      include: {
        project: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } },
        assignees: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } }
          }
        }
      }
    });

    // Notify all assigned members who are not the creator
    const notifyUserIds = targetIds.filter(id => id !== creatorId);
    if (notifyUserIds.length > 0) {
      const notif = await prisma.notification.create({
        data: {
          eventType: 'TASK_ASSIGNED',
          title: '📋 New Project Task Assigned',
          body: `"${title}" was assigned to you by ${task.createdBy.firstName} ${task.createdBy.lastName}${task.project ? ` under project [${task.project.name}]` : ''}.`
        }
      });

      await prisma.notificationRecipient.createMany({
        data: notifyUserIds.map(uId => ({
          notificationId: notif.id,
          userId: uId
        }))
      });

      notifyUserIds.forEach(uId => {
        eventBus.emit(DomainEvents.TASK_ASSIGNED, {
          taskId: task.id,
          title: task.title,
          assignedToId: uId,
          creatorName: `${task.createdBy.firstName} ${task.createdBy.lastName}`,
          createdById: creatorId
        });
      });
    } else {
      eventBus.emit(DomainEvents.TASK_CREATED, {
        taskId: task.id,
        title: task.title,
        userId: creatorId
      });
    }

    return res.status(201).json({
      success: true,
      message: targetIds.length > 1 ? `Task assigned to ${targetIds.length} team members.` : (primaryAssigneeId === creatorId ? 'Personal task created.' : 'Task assigned successfully.'),
      data: task
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 2. Get My Tasks (Created by me or Assigned to me via single or multi-assignee)
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id!;

    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { assignedToId: userId },
          { createdById: userId },
          { assignees: { some: { userId } } }
        ]
      },
      include: {
        project: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } },
        assignees: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: tasks });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Get Team Tasks Board (For Manager & Admin)
router.get('/team', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role!;
    const userId = req.user?.id!;

    let whereClause: any = {};
    if (role === 'MANAGER') {
      whereClause = {
        OR: [
          { assignedToId: userId },
          { createdById: userId },
          { assignees: { some: { userId } } },
          { assignedTo: { reportingManagerId: userId } },
          { assignees: { some: { user: { reportingManagerId: userId } } } }
        ]
      };
    } else if (role === 'EMPLOYEE') {
      whereClause = {
        OR: [
          { assignedToId: userId },
          { createdById: userId },
          { assignees: { some: { userId } } }
        ]
      };
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        project: true,
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } },
        assignees: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, designation: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: tasks });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 4. Update Task Status
router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id!;

    if (!['TODO', 'IN_PROGRESS', 'DONE', 'BLOCKED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: { assignedTo: true, createdBy: true }
    });

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const role = req.user?.role;
    const isAssignee = task.assignedToId === userId;
    const isCreator = task.createdById === userId;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role || '');

    if (!isAssignee && !isCreator && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. You can only update the status of tasks assigned to or created by you.'
      });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: { status },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }
      }
    });

    if (status === 'DONE') {
      eventBus.emit(DomainEvents.TASK_COMPLETED, {
        taskId: task.id,
        title: task.title,
        createdById: task.createdById,
        assigneeName: `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
      });
    } else {
      eventBus.emit(DomainEvents.TASK_STATUS_UPDATED, {
        taskId: task.id,
        title: task.title,
        createdById: task.createdById,
        status
      });
    }

    return res.json({ success: true, message: `Task moved to ${status}.`, data: updated });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Delete Task
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id!;
    const role = req.user?.role!;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    // Role check: Creator or Admin can delete
    if (role !== 'ADMIN' && task.createdById !== userId) {
      return res.status(403).json({ success: false, message: 'You can only delete tasks you created.' });
    }

    await prisma.task.delete({ where: { id } });
    return res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
