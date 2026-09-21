import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { eventBus, DomainEvents } from '../events/eventBus';

let io: SocketIOServer | null = null;

export function initSocketServer(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // JWT Authentication for Socket Connections
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token as string;
    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;

    // Join Personal Room
    if (user?.id) {
      socket.join(`user:${user.id}`);
    }

    // Join Role & Org Room
    if (user?.role) {
      socket.join(`role:${user.role}`);
    }
    socket.join('org:global');

    // Join Manager Team Room
    if (user?.reportingManagerId) {
      socket.join(`team:${user.reportingManagerId}`);
    }

    socket.on('disconnect', () => {});
  });

  // Subscribe to EDA Events & Dispatch over WebSockets
  eventBus.on(DomainEvents.ATTENDANCE_CLOCKED_IN, (payload) => {
    io?.to('org:global').emit('attendance:live_update', payload);
  });

  eventBus.on(DomainEvents.ATTENDANCE_LATE_DETECTED, (payload) => {
    if (payload.managerId) {
      io?.to(`user:${payload.managerId}`).emit('notification:alert', {
        title: '⚠️ Late Arrival Alert',
        message: `${payload.userName} clocked in late at ${payload.time}.`
      });
    }
    io?.to('org:global').emit('attendance:live_update', payload);
  });

  eventBus.on(DomainEvents.LEAVE_APPLIED, (payload) => {
    if (payload.managerId) {
      io?.to(`user:${payload.managerId}`).emit('notification:new', {
        title: '🏖️ New Leave Request',
        message: `${payload.applicantName} requested ${payload.duration} ${payload.leaveType} leave.`
      });
    }
    io?.to('role:ADMIN').emit('leaves:new_request', payload);
  });

  eventBus.on(DomainEvents.LEAVE_APPROVED, (payload) => {
    io?.to(`user:${payload.applicantId}`).emit('notification:new', {
      title: '🎉 Leave Approved!',
      message: `Your leave request for ${payload.fromDate} has been approved.`
    });
    io?.to('org:global').emit('leaves:status_update', payload);
  });

  eventBus.on(DomainEvents.LEAVE_REJECTED, (payload) => {
    io?.to(`user:${payload.applicantId}`).emit('notification:new', {
      title: '⚠️ Leave Request Declined',
      message: `Your leave application for ${payload.fromDate} was not approved.`
    });
    io?.to('org:global').emit('leaves:status_update', payload);
  });

  // Task Events
  eventBus.on(DomainEvents.TASK_ASSIGNED, (payload) => {
    io?.to(`user:${payload.assignedToId}`).emit('notification:new', {
      title: '📋 New Task Assigned',
      message: `You were assigned task: "${payload.title}" by ${payload.creatorName}.`
    });
    io?.to('org:global').emit('tasks:updated', payload);
  });

  eventBus.on(DomainEvents.TASK_STATUS_UPDATED, (payload) => {
    io?.to(`user:${payload.createdById}`).emit('notification:alert', {
      title: '⚡ Task Status Updated',
      message: `Task "${payload.title}" is now marked as ${payload.status}.`
    });
    io?.to('org:global').emit('tasks:updated', payload);
  });

  eventBus.on(DomainEvents.TASK_COMPLETED, (payload) => {
    io?.to(`user:${payload.createdById}`).emit('notification:new', {
      title: '✅ Task Completed!',
      message: `Task "${payload.title}" was completed by ${payload.assigneeName}.`
    });
    io?.to('org:global').emit('tasks:updated', payload);
  });

  eventBus.on(DomainEvents.BROADCAST_PUBLISHED, (payload) => {
    if (payload.priority === 'URGENT') {
      io?.to('org:global').emit('broadcast:urgent_modal', payload);
    } else {
      io?.to('org:global').emit('broadcast:new', payload);
    }
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
}
