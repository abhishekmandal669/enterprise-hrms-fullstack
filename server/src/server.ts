import express from 'express';
import http from 'http';
import cors from 'cors';
import { config } from './config';
import { initSocketServer } from './websocket/socketManager';
import { startAttendanceScheduler } from './services/attendanceScheduler';
import { initializeScheduledJobs } from './jobs/scheduler';

// Import Central API Router
import apiRouter from './routes';
import { errorHandler } from './core/middleware';

const app = express();
const server = http.createServer(app);

import path from 'path';

// Middlewares
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. curl, mobile apps, same-origin)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS: Origin '${origin}' not allowed.`), false);
  },
  credentials: true
}));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Central API Gateway Routes (/api/v1)
app.use('/api/v1', apiRouter);

// Global Error Handler Middleware
app.use(errorHandler);

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Lexvera Enterprise HRMS Server',
    timestamp: new Date().toISOString()
  });
});

// Initialize Socket.io
initSocketServer(server);

// Initialize Attendance Scheduler Daemon (Missed Punch Auto-Clockout)
startAttendanceScheduler();

// Initialize Phase 1 Core Cron Schedulers (Leave Accrual, Carry Forward, Auto-Absent)
initializeScheduledJobs();

// Start Server
server.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Lexvera Enterprise HRMS Server is RUNNING`);
  console.log(`📡 REST API:      http://localhost:${config.port}/api/v1`);
  console.log(`⚡ WebSocket WSS: http://localhost:${config.port}`);
  console.log(`=======================================================`);
});
