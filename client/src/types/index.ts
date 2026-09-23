/**
 * Nexus Enterprise HRMS Shared Frontend Type Definitions
 */

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'HR_ADMIN' | 'MANAGER' | 'EMPLOYEE';

export type UserStatus = 'INVITED' | 'ACTIVE' | 'PROBATION' | 'SUSPENDED' | 'RESIGNED' | 'TERMINATED' | 'EXITED';

export interface User {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  designation?: string;
  departmentId?: string;
  department?: { id: string; name: string };
  reportingManagerId?: string;
  reportingManager?: { id: string; firstName: string; lastName: string; email: string };
  avatarUrl?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  profileCompleted?: boolean;
  createdAt: string;
}

export interface Shift {
  id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  graceMinutes: number;
  breakMinutes: number;
  weekOffs: string;
  isActive: boolean;
  createdAt: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  isOptional: boolean;
  description?: string;
  createdAt: string;
}

export interface GeofenceConfig {
  officeLatitude: number;
  officeLongitude: number;
  allowedRadiusMeters: number;
  isEnforced: boolean;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  attendanceDate: string;
  clockInTime: string;
  clockOutTime?: string | null;
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT';
  workMode: 'OFFICE' | 'REMOTE';
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  user?: Partial<User>;
}

export interface LeaveRequestItem {
  id: string;
  userId: string;
  leaveTypeId: string;
  leaveType?: { id: string; name: string; code: string };
  fromDate: string;
  toDate: string;
  durationDays: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  rejectionReason?: string;
  user?: Partial<User>;
  approvedBy?: Partial<User>;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  projectId?: string;
  createdById: string;
  assignedToId: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
  dueDate?: string;
  assignedTo?: Partial<User>;
  createdBy?: Partial<User>;
  createdAt: string;
}

export interface TimesheetEntry {
  id: string;
  userId: string;
  logDate: string;
  projectId?: string;
  taskTitle: string;
  activityDescription: string;
  totalMinutes: number;
  productiveMinutes: number;
  activityType: string;
  isBillable: boolean;
  status: string;
  project?: { id: string; name: string; code: string; clientName?: string };
  user?: Partial<User>;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  actorId?: string;
  actor?: Partial<User>;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress?: string;
  metaDetails?: string;
  createdAt: string;
}
