import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock, CheckCircle2, XCircle, Loader2,
  Search, Users, Sparkles, Briefcase,
  Calendar, Plus, Pencil, Trash2, Eye, X,
  ArrowUpRight, AlertCircle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowLeft, FileText, Check, ShieldCheck, CalendarDays
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { EmployeeDetailDrawer } from '../components/EmployeeDetailDrawer';
import { ConfirmModal } from '../components/ConfirmModal';
import { CustomSelect } from '../components/CustomSelect';
import { CustomTimePicker } from '../components/CustomTimePicker';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const isWeekend = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 = Sun, 6 = Sat
  return day === 0 || day === 6;
};

export const TimesheetsView: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useSocket();

  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'HR_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'HR_ADMIN';

  // Active top-level subtab: For Admin/Manager default to PERSONS, for Employee default to MY
  const [activeTab, setActiveTab] = useState<'PERSONS' | 'ALL' | 'MY' | 'COMPLIANCE'>(
    isManagerOrAdmin ? 'PERSONS' : 'MY'
  );

  // Compliance Monitoring State (Admin & Manager)
  const [complianceDate, setComplianceDate] = useState(new Date().toISOString().split('T')[0]);
  const [complianceData, setComplianceData] = useState<any>(null);
  const [loadingCompliance, setLoadingCompliance] = useState(false);

  // Configurable Pagination State (10, 25, 50, 100)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // View Mode: 'TABLE' (default list) or 'CALENDAR' (monthly calendar view as in Attendance)
  const [timesheetViewMode, setTimesheetViewMode] = useState<'TABLE' | 'CALENDAR'>('TABLE');
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth()); // 0-indexed

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(y => y - 1);
    } else {
      setCalMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(y => y + 1);
    } else {
      setCalMonth(m => m + 1);
    }
  };

  const jumpToToday = () => {
    const today = new Date();
    setCalYear(today.getFullYear());
    setCalMonth(today.getMonth());
  };

  // Timesheets Data State
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');

  // Admin/Manager: Persons / Employees Grid State
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selected360UserId, setSelected360UserId] = useState<string | null>(null);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  // Log Work Drawer / Form State (Time-Based Entry)
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false);
  const [editingTimesheetId, setEditingTimesheetId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [projectId, setProjectId] = useState('');
  const [startTime, setStartTime] = useState('09:30');
  const [endTime, setEndTime] = useState('18:00');
  const [breakMinutes, setBreakMinutes] = useState(30);
  const [taskTitle, setTaskTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [activityType, setActivityType] = useState('DEVELOPMENT');
  const [isBillable, setIsBillable] = useState(true);
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [logSubmitError, setLogSubmitError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // View Details Modal State
  const [viewingTimesheet, setViewingTimesheet] = useState<any | null>(null);

  // Strict Time calculations from From Time & To Time (Midnight crossing supported)
  const calculateDuration = () => {
    if (!startTime || !endTime) return { totalMins: 480, prodMins: 450, totalHrs: 8, prodHrs: 7.5, error: null };

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    let startTotal = startH * 60 + startM;
    let endTotal = endH * 60 + endM;

    if (endTotal < startTotal) {
      endTotal += 24 * 60; // Overnight shift handling (e.g. 22:00 to 06:00)
    }

    const shiftDuration = endTotal - startTotal;
    const bMins = Number(breakMinutes || 0);

    let error: string | null = null;
    if (bMins >= shiftDuration) {
      error = 'Break duration cannot equal or exceed total shift duration.';
    }

    const diffMins = Math.max(15, shiftDuration);
    const prodMins = Math.max(15, Math.max(0, diffMins - bMins));
    const totalHrs = Number((diffMins / 60).toFixed(1));
    const prodHrs = Number((prodMins / 60).toFixed(1));

    return { totalMins: diffMins, prodMins, totalHrs, prodHrs, error };
  };

  const timeComputed = calculateDuration();

  // Fetch Timesheet Feed with Configurable Pagination and Month Date-Range
  const fetchTimesheets = async (
    page = currentPage,
    limit = pageSize,
    project = projectFilter,
    status = statusFilter,
    search = searchQuery,
    fromDateParam?: string,
    toDateParam?: string
  ) => {
    try {
      setLoading(true);
      let endpoint = '/timesheets/my';
      if (activeTab === 'ALL') {
        endpoint = isManagerOrAdmin ? (isAdmin ? '/timesheets/all' : '/timesheets/team') : '/timesheets/my';
      }

      const params: any = {
        page,
        limit
      };
      if (project !== 'ALL') params.projectId = project;
      if (status !== 'ALL') params.status = status;
      if (search.trim()) params.search = search.trim();
      if (fromDateParam) params.fromDate = fromDateParam;
      if (toDateParam) params.toDate = toDateParam;

      const res = await api.get(endpoint, { params });
      if (res.data.success) {
        if (Array.isArray(res.data.data)) {
          setTimesheets(res.data.data);
          setTotalEntries(res.data.data.length);
          setTotalPages(Math.ceil(res.data.data.length / limit) || 1);
          const totalMins = res.data.data.reduce((acc: number, t: any) => acc + (t.totalMinutes || 0), 0);
          const prodMins = res.data.data.reduce((acc: number, t: any) => acc + (t.productiveMinutes || 0), 0);
          setMetrics({
            totalHours: Number((totalMins / 60).toFixed(1)),
            productiveHours: Number((prodMins / 60).toFixed(1)),
            totalEntries: res.data.data.length
          });
        } else {
          setTimesheets(res.data.data.timesheets || []);
          setMetrics(res.data.data.metrics || null);
          if (res.data.data.pagination) {
            setTotalEntries(res.data.data.pagination.totalEntries);
            setTotalPages(res.data.data.pagination.totalPages);
          } else {
            const count = res.data.data.timesheets?.length || 0;
            setTotalEntries(count);
            setTotalPages(Math.ceil(count / limit) || 1);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load timesheets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    const target = Math.max(1, Math.min(calculatedTotalPages, newPage));
    setCurrentPage(target);
    fetchTimesheets(target, pageSize, projectFilter, statusFilter, searchQuery);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    fetchTimesheets(1, newSize, projectFilter, statusFilter, searchQuery);
  };

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
    fetchTimesheets(1, pageSize, projectFilter, newStatus, searchQuery);
  };

  const handleProjectFilterChange = (newProject: string) => {
    setProjectFilter(newProject);
    setCurrentPage(1);
    fetchTimesheets(1, pageSize, newProject, statusFilter, searchQuery);
  };

  // Fetch Employee Directory for Admin/Manager
  const fetchEmployees = async () => {
    if (!isManagerOrAdmin) return;
    try {
      setLoadingEmployees(true);
      const endpoint = isAdmin ? '/admin/employees?limit=100' : '/attendance/team-roster';
      const res = await api.get(endpoint);
      if (res.data.success) {
        setEmployees(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load employee list:', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Fetch Projects for Logger Form
  const fetchProjects = async () => {
    try {
      const res = await api.get('/timesheets/projects');
      if (res.data.success && res.data.data.length > 0) {
        setProjects(res.data.data);
        if (!projectId) setProjectId(res.data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  // Fetch Compliance Monitoring Data
  const fetchCompliance = async () => {
    try {
      setLoadingCompliance(true);
      const res = await api.get(`/timesheets/compliance?date=${complianceDate}`);
      if (res.data.success) {
        setComplianceData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load compliance data:', err);
    } finally {
      setLoadingCompliance(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'PERSONS') {
      fetchEmployees();
    } else if (activeTab === 'COMPLIANCE') {
      fetchCompliance();
    } else {
      if (timesheetViewMode === 'CALENDAR') {
        const daysInM = new Date(calYear, calMonth + 1, 0).getDate();
        const start = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
        const end = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(daysInM).padStart(2, '0')}`;
        fetchTimesheets(1, 100, projectFilter, statusFilter, searchQuery, start, end);
      } else {
        fetchTimesheets(currentPage, pageSize, projectFilter, statusFilter, searchQuery);
      }
    }
  }, [activeTab, complianceDate, timesheetViewMode, calYear, calMonth]);

  useEffect(() => {
    if (activeTab === 'PERSONS' || activeTab === 'COMPLIANCE') return;
    const timer = setTimeout(() => {
      if (timesheetViewMode === 'CALENDAR') {
        const daysInM = new Date(calYear, calMonth + 1, 0).getDate();
        const start = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-01`;
        const end = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(daysInM).padStart(2, '0')}`;
        fetchTimesheets(1, 100, projectFilter, statusFilter, searchQuery, start, end);
      } else {
        fetchTimesheets(currentPage, pageSize, projectFilter, statusFilter, searchQuery);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleOpenAddDrawer = () => {
    setEditingTimesheetId(null);
    setLogSubmitError(null);
    setLogDate(new Date().toISOString().split('T')[0]);
    if (projects.length > 0) setProjectId(projects[0].id);
    setStartTime('09:30');
    setEndTime('18:00');
    setBreakMinutes(30);
    setTaskTitle('');
    setActivityDescription('');
    setActivityType('DEVELOPMENT');
    setIsBillable(true);
    setIsLogDrawerOpen(true);
  };

  const handleStartEdit = (t: any) => {
    setEditingTimesheetId(t.id);
    setLogSubmitError(null);
    setLogDate(t.logDate);
    setProjectId(t.projectId || (projects[0]?.id || ''));
    setTaskTitle(t.taskTitle);
    setActivityDescription(t.activityDescription);
    setActivityType(t.activityType || 'DEVELOPMENT');
    setIsBillable(!!t.isBillable);
    
    // Approximate start/end time from logged minutes
    setStartTime('09:30');
    const totalM = t.totalMinutes || 480;
    const endH = Math.floor((570 + totalM) / 60) % 24;
    const endMin = (570 + totalM) % 60;
    const endStr = `${String(endH).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
    setEndTime(endStr);
    const breakM = Math.max(0, (t.totalMinutes || 480) - (t.productiveMinutes || 450));
    setBreakMinutes(breakM);

    setIsLogDrawerOpen(true);
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDeleteTimesheet = (id: string) => {
    setDeleteConfirmId(id);
  };

  const executeDeleteTimesheet = async () => {
    if (!deleteConfirmId) return;
    try {
      setDeletingId(deleteConfirmId);
      const res = await api.delete(`/timesheets/${deleteConfirmId}`);
      if (res.data.success) {
        addToast('Timesheet Deleted', 'Work log removed successfully.', 'success');
        if (viewingTimesheet?.id === deleteConfirmId) setViewingTimesheet(null);
        setDeleteConfirmId(null);
        fetchTimesheets();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to delete timesheet.', 'danger');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmitTimesheet = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogSubmitError(null);

    if (!taskTitle.trim() || !activityDescription.trim()) {
      const errMsg = 'Task deliverable title and detailed work breakdown are required.';
      setLogSubmitError(errMsg);
      addToast('Validation Error', errMsg, 'warning');
      return;
    }

    try {
      const computed = calculateDuration();
      if (computed.error) {
        setLogSubmitError(computed.error);
        addToast('Validation Error', computed.error, 'warning');
        return;
      }

      setIsSubmittingLog(true);

      const payload = {
        logDate: logDate || new Date().toISOString().split('T')[0],
        projectId: projectId || undefined,
        taskTitle: taskTitle.trim(),
        activityDescription: activityDescription.trim(),
        totalMinutes: computed.totalMins,
        productiveMinutes: computed.prodMins,
        activityType,
        isBillable
      };

      if (editingTimesheetId) {
        const res = await api.put(`/timesheets/${editingTimesheetId}`, payload);
        if (res.data.success) {
          addToast('Timesheet Updated', 'Your daily work log has been updated successfully.', 'success');
        }
      } else {
        const res = await api.post('/timesheets', payload);
        if (res.data.success) {
          addToast('Timesheet Logged', 'Your daily work log has been saved for review.', 'success');
        }
      }

      setIsLogDrawerOpen(false);
      setEditingTimesheetId(null);
      setLogSubmitError(null);
      fetchTimesheets();
      if (activeTab === 'PERSONS') {
        fetchEmployees();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to save timesheet entry. Please try again.';
      setLogSubmitError(errMsg);
      addToast('Submission Error', errMsg, 'danger');
    } finally {
      setIsSubmittingLog(false);
    }
  };

  // Filter timesheets based on search, status, and project
  const filteredTimesheets = timesheets.filter(t => {
    const q = searchQuery.toLowerCase();
    const titleMatch = t.taskTitle?.toLowerCase().includes(q) || (t.activityDescription || '').toLowerCase().includes(q);
    const projectName = t.project ? `${t.project.name} ${t.project.code} ${t.project.clientName || ''}`.toLowerCase() : '';
    const projectMatch = projectName.includes(q);
    const empName = `${t.user?.firstName || ''} ${t.user?.lastName || ''}`.toLowerCase();
    const empMatch = empName.includes(q);

    if (searchQuery && !titleMatch && !projectMatch && !empMatch) return false;
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (projectFilter !== 'ALL' && t.projectId !== projectFilter) return false;
    return true;
  });

  // Effective calculated total pages (prevents stale pagination count)
  const calculatedTotalPages = Math.max(
    1,
    totalPages,
    Math.ceil((totalEntries || filteredTimesheets.length) / pageSize)
  );

  // Client-side windowing fallback if backend returned more records than pageSize
  const displayedTimesheets = filteredTimesheets.length > pageSize
    ? filteredTimesheets.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : filteredTimesheets;

  // Days in selected calendar month
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(calYear, calMonth, 1).getDay(); // 0 is Sunday
  const mondayOffset = (firstDayWeekday + 6) % 7; // Monday = 0, Sunday = 6
  const todayStr = new Date().toISOString().split('T')[0];

  // Group timesheets by Date for Month Calendar Matrix
  const timesheetsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    filteredTimesheets.forEach(t => {
      const d = t.logDate;
      if (!map[d]) map[d] = [];
      map[d].push(t);
    });
    return map;
  }, [filteredTimesheets]);

  // Monthly stats computation for Calendar Mode
  const monthStats = useMemo(() => {
    let loggedDaysCount = 0;
    let workingDaysCount = 0;
    let totalMonthMinutes = 0;
    let totalProdMonthMinutes = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isWk = isWeekend(dStr);
      const isPastOrToday = dStr <= todayStr;
      if (!isWk && isPastOrToday) {
        workingDaysCount++;
      }
      const entries = timesheetsByDate[dStr];
      if (entries && entries.length > 0) {
        loggedDaysCount++;
        entries.forEach(e => {
          totalMonthMinutes += (e.totalMinutes || 0);
          totalProdMonthMinutes += (e.productiveMinutes || 0);
        });
      }
    }

    const missingDays = Math.max(0, workingDaysCount - loggedDaysCount);
    const totalMonthHours = Number((totalMonthMinutes / 60).toFixed(1));
    const totalProdHours = Number((totalProdMonthMinutes / 60).toFixed(1));
    const avgHoursPerDay = loggedDaysCount > 0 ? Number((totalMonthHours / loggedDaysCount).toFixed(1)) : 0;
    const efficiencyRate = totalMonthHours > 0 ? Math.round((totalProdHours / totalMonthHours) * 100) : 100;

    return {
      workingDaysCount,
      loggedDaysCount,
      missingDays,
      totalMonthHours,
      totalProdHours,
      avgHoursPerDay,
      efficiencyRate
    };
  }, [daysInMonth, calYear, calMonth, todayStr, timesheetsByDate]);

  const getStatusBadge = (_status: string) => {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="w-3 h-3" />
        <span>Work Logged</span>
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
        {category.replace('_', ' ')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP HEADER & METRIC DOSSIER STRIP */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Timesheet & Daily Work Operations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {isManagerOrAdmin ? 'Team Operations' : 'Employee Workspace'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Log your daily project tasks, track work hours, and review team submissions
          </p>
        </div>

        {/* Primary Action: Log Work Time Button */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenAddDrawer}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/30 transition transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Log Work Time</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold">Total Logged Time</span>
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono-num">
              {metrics.totalHours || 0} <span className="text-xs font-medium text-slate-400">Hours</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">Across all logged deliverables</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold">Productive Core Work</span>
              <Sparkles className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono-num">
              {metrics.productiveHours || 0} <span className="text-xs font-medium text-slate-400">Hours</span>
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 block font-medium">Focused development & operations</span>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold">Total Logged Entries</span>
              <Briefcase className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono-num">
              {metrics.totalEntries || filteredTimesheets.length} <span className="text-xs font-medium text-slate-400">Logs</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block font-medium">Total submissions recorded</span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. ROLE TABS (FOR ADMIN / MANAGER) */}
      {/* ------------------------------------------------------------- */}
      {isManagerOrAdmin && (
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('PERSONS')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'PERSONS'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Staff Activity Directory ({employees.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ALL')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>{isAdmin ? 'All Org Timesheets' : 'My Team Timesheets'}</span>
          </button>

          <button
            onClick={() => setActiveTab('MY')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'MY'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>My Personal Timesheets</span>
          </button>

          <button
            onClick={() => setActiveTab('COMPLIANCE')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'COMPLIANCE'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Compliance Monitor</span>
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2B. ADMIN/MANAGER: TIMESHEET COMPLIANCE MONITOR */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'COMPLIANCE' && isManagerOrAdmin ? (
        <div className="space-y-6">
          {/* Controls Bar: Date Picker & Compliance Headline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Daily Timesheet Compliance Monitor</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Daily Verification
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Track which team members have recorded end-of-day work logs versus who is pending.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={complianceDate}
                onChange={(e) => setComplianceDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono-num font-bold text-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => setComplianceDate(new Date().toISOString().split('T')[0])}
                className="px-3 py-1.5 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
              >
                Today
              </button>
            </div>
          </div>

          {/* Compliance Stats Cards */}
          {complianceData && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="text-xs font-semibold text-slate-400 block">Total Headcount</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono-num">
                  {complianceData.totalEmployees}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Active team members</span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block">Logged Work</span>
                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono-num">
                  {complianceData.submittedCount}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Submitted entries</span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 block">Pending / Missing</span>
                <span className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono-num">
                  {complianceData.missingCount}
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Awaiting submission</span>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 block">Compliance Rate</span>
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono-num">
                  {complianceData.complianceRate}%
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Completion ratio</span>
              </div>
            </div>
          )}

          {/* Detailed Lists */}
          {loadingCompliance ? (
            <div className="p-16 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
              <span>Verifying compliance logs...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Submitted Users List */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Submitted Timesheets ({complianceData?.submittedUsers?.length || 0})
                    </h4>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {complianceData?.submittedUsers?.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">No timesheets submitted yet for this date.</div>
                  ) : (
                    complianceData?.submittedUsers?.map((u: any) => (
                      <div
                        key={u.timesheetId}
                        className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <strong className="block text-slate-900 dark:text-white">{u.name}</strong>
                          <span className="text-[11px] text-slate-400 block">{u.designation} &bull; {u.department}</span>
                          <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mt-1 block">
                            Task: {u.taskTitle}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 block mb-1">
                            {(u.totalMinutes / 60).toFixed(1)}h logged
                          </span>
                          <span className="text-[10px] text-slate-400 block">{(u.productiveMinutes / 60).toFixed(1)}h prod</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Pending / Missing Users List */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-500" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Pending Submissions ({complianceData?.pendingUsers?.length || 0})
                    </h4>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {complianceData?.pendingUsers?.length === 0 ? (
                    <div className="text-center py-8 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      🎉 100% Compliance! All employees have logged work for this date.
                    </div>
                  ) : (
                    complianceData?.pendingUsers?.map((u: any) => (
                      <div
                        key={u.userId}
                        className="p-3 bg-rose-50/40 dark:bg-rose-950/20 rounded-2xl border border-rose-200/50 dark:border-rose-900/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <strong className="block text-slate-900 dark:text-white">{u.name}</strong>
                          <span className="text-[11px] text-slate-400 block">{u.designation || 'Staff'} &bull; {u.department}</span>
                          <span className="text-[10px] text-slate-400 block">{u.email}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          Missing Log
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === 'PERSONS' && isManagerOrAdmin ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                placeholder="Search employee by name, designation, department..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400"
              />
            </div>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
              Click any employee to inspect detailed timesheets, tasks, and attendance
            </span>
          </div>

          {loadingEmployees ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading team members roster...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees
                .filter(emp => {
                  const q = employeeSearch.toLowerCase();
                  const name = (emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`).toLowerCase();
                  const desig = (emp.designation || '').toLowerCase();
                  const dept = (emp.department || '').toLowerCase();
                  return name.includes(q) || desig.includes(q) || dept.includes(q);
                })
                .map(emp => {
                  const displayName = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`;
                  return (
                    <div
                      key={emp.id || emp.userId}
                      onClick={() => setSelected360UserId(emp.id || emp.userId)}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-indigo-400 dark:hover:border-indigo-600 transition cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={emp.avatarUrl || emp.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'}
                            alt=""
                            className="w-11 h-11 rounded-2xl object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                          />
                          <div>
                            <strong className="text-sm font-bold text-slate-900 dark:text-white block group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                              {displayName}
                            </strong>
                            <span className="text-xs text-slate-400 block">{emp.designation || 'Team Member'}</span>
                            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                              {emp.department || 'Operations'}
                            </span>
                          </div>
                        </div>

                        <span className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition">
                          <ArrowUpRight className="w-4 h-4" />
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Timesheets & Tasks</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                          View Activity Details &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* 4. TIMESHEET FEED: DATE-WISE OR LIST-WISE FORMAT */
        /* ------------------------------------------------------------- */
        <div className="space-y-4">
          
          {/* Controls Bar: Search, Status Filter, Project Filter, View Mode Toggle */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by task deliverable, project, or activity..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>

            {/* Filters & Format Switcher */}
            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Status Filter */}
              <div className="w-[145px]">
                <CustomSelect
                  value={statusFilter}
                  onChange={(val) => handleStatusFilterChange(val)}
                  size="sm"
                  options={[
                    { value: 'ALL', label: 'All Statuses' },
                    { value: 'SUBMITTED', label: 'Pending Review' },
                    { value: 'APPROVED', label: 'Approved' },
                    { value: 'REJECTED', label: 'Rejected' },
                  ]}
                />
              </div>

              {/* Project Filter */}
              <div className="w-[175px]">
                <CustomSelect
                  value={projectFilter}
                  onChange={(val) => handleProjectFilterChange(val)}
                  size="sm"
                  placeholder="All Projects"
                  options={[
                    { value: 'ALL', label: 'All Projects' },
                    ...projects.map(p => ({
                      value: p.id,
                      label: `${p.name}`,
                      badge: p.code,
                      badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                    }))
                  ]}
                />
              </div>

              {/* View Mode Switcher: Table List vs Monthly Calendar */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setTimesheetViewMode('TABLE')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                    timesheetViewMode === 'TABLE'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Table List</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTimesheetViewMode('CALENDAR')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                    timesheetViewMode === 'CALENDAR'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Monthly Calendar</span>
                </button>
              </div>

              {/* Configurable Page Size Selector (10, 25, 50, 100) - Only in Table Mode */}
              {timesheetViewMode === 'TABLE' && (
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 pl-2">Rows:</span>
                  {[10, 25, 50, 100].map(sz => (
                    <button
                      key={sz}
                      onClick={() => handlePageSizeChange(sz)}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                        pageSize === sz
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              )}

            </div>

          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* 4A. MONTHLY CALENDAR VIEW (ATTENDANCE STYLE)                   */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {timesheetViewMode === 'CALENDAR' ? (
            <div className="space-y-6">

              {/* Monthly KPI Dossier Strip (6 KPIs) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/50 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between transition hover:shadow-xs">
                  <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Total Logged</span>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-black text-indigo-700 dark:text-indigo-300 font-mono-num">
                    {monthStats.totalMonthHours} <span className="text-xs font-semibold">hrs</span>
                  </div>
                  <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400/80 mt-0.5 block">Entire Month</span>
                </div>

                <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/50 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between transition hover:shadow-xs">
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Productive Core</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono-num">
                    {monthStats.totalProdHours} <span className="text-xs font-semibold">hrs</span>
                  </div>
                  <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 block">Focused core work</span>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between transition hover:shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Days Logged</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono-num">
                    {monthStats.loggedDaysCount} <span className="text-xs font-semibold">/ {monthStats.workingDaysCount}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Working days</span>
                </div>

                <div className="bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/50 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between transition hover:shadow-xs">
                  <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Missing Logs</span>
                    <AlertCircle className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono-num">
                    {monthStats.missingDays} <span className="text-xs font-semibold">Days</span>
                  </div>
                  <span className="text-[10px] text-rose-500 mt-0.5 block">Unsubmitted past days</span>
                </div>

                <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/40 dark:border-indigo-900/40 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between transition hover:shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Daily Average</span>
                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono-num">
                    {monthStats.avgHoursPerDay} <span className="text-xs font-semibold">hrs/day</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">On logged days</span>
                </div>

                <div className="bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-900/50 rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between transition hover:shadow-xs">
                  <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Efficiency</span>
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono-num">
                    {monthStats.efficiencyRate}%
                  </div>
                  <span className="text-[10px] text-purple-500 mt-0.5 block">Prod / Total ratio</span>
                </div>
              </div>

              {/* Calendar Grid Container */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                
                {/* Month / Year Navigator Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={prevMonth}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                      title="Previous Month"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white px-2 min-w-[180px] text-center">
                      {MONTHS[calMonth]} {calYear}
                    </h3>
                    <button
                      type="button"
                      onClick={nextMonth}
                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                      title="Next Month"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <span className="hidden sm:inline text-xs font-semibold text-slate-400 dark:text-slate-500">
                      {monthStats.loggedDaysCount} of {monthStats.workingDaysCount} Working Days Logged
                    </span>
                    <button
                      type="button"
                      onClick={jumpToToday}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Today</span>
                    </button>
                  </div>
                </div>

                {/* Weekday Header Strip & Calendar Days Matrix (Scrollable on small mobile) */}
                <div className="overflow-x-auto pb-2">
                  <div className="min-w-[620px] space-y-3">
                    <div className="grid grid-cols-7 text-center">
                      {WEEKDAYS.map((d, idx) => (
                        <div
                          key={d}
                          className={`text-[11px] font-bold uppercase tracking-wider py-1.5 ${
                            idx >= 5 ? 'text-rose-500/80 dark:text-rose-400/80' : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {d}
                        </div>
                      ))}
                    </div>

                {/* Calendar Days Matrix */}
                {loading ? (
                  <div className="py-24 text-center text-xs text-slate-400 animate-pulse">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    <span>Loading monthly timesheet calendar...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-2">
                    {/* Empty Offset Cells */}
                    {Array.from({ length: mondayOffset }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="min-h-[105px] sm:min-h-[120px] rounded-2xl bg-slate-50/30 dark:bg-slate-800/10 border border-dashed border-slate-100 dark:border-slate-800/50"
                      />
                    ))}

                    {/* Day Matrix Cells */}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const dayNum = i + 1;
                      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                      const entries = timesheetsByDate[dateStr] || [];
                      const hasEntries = entries.length > 0;
                      const isSatSun = isWeekend(dateStr);
                      const isToday = dateStr === todayStr;
                      const isFuture = dateStr > todayStr;

                      const totMins = entries.reduce((a, b) => a + (b.totalMinutes || 0), 0);
                      const prodMins = entries.reduce((a, b) => a + (b.productiveMinutes || 0), 0);
                      const totalHrs = (totMins / 60).toFixed(1);
                      const prodHrs = (prodMins / 60).toFixed(1);
                      const primaryEntry = entries[0];

                      return (
                        <div
                          key={dateStr}
                          className={`
                            min-h-[105px] sm:min-h-[120px] p-2 sm:p-2.5 rounded-2xl border transition-all flex flex-col justify-between select-none
                            ${isFuture && !hasEntries ? 'opacity-40 cursor-not-allowed bg-slate-50/40 dark:bg-slate-800/20 border-slate-200/50 dark:border-slate-800' : ''}
                            ${!isFuture && !hasEntries && !isSatSun ? 'border-dashed border-rose-300/80 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/15' : ''}
                            ${isSatSun && !hasEntries ? 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/60 dark:border-slate-800/60' : ''}
                            ${hasEntries ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:shadow-md hover:-translate-y-0.5 cursor-pointer shadow-2xs' : ''}
                            ${isToday ? 'ring-2 ring-indigo-500 shadow-xs' : ''}
                          `}
                          onClick={() => {
                            if (hasEntries) {
                              setViewingTimesheet(primaryEntry);
                            }
                          }}
                        >
                          {/* Top: Day Number & Indicators */}
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs font-bold leading-none font-mono-num ${
                                isToday
                                  ? 'px-1.5 py-0.5 rounded-md bg-indigo-600 text-white'
                                  : isSatSun
                                  ? 'text-rose-500 dark:text-rose-400'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {dayNum}
                            </span>

                            {hasEntries && entries.length > 1 && (
                              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-indigo-100 dark:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300">
                                +{entries.length - 1} more
                              </span>
                            )}
                          </div>

                          {/* Middle: Log Content or Missing / Off Status */}
                          <div className="my-1 flex-1 flex flex-col justify-center">
                            {hasEntries ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[11px] font-bold">
                                  <span className="text-slate-900 dark:text-white font-mono-num">
                                    {totalHrs}h <span className="text-[9px] font-normal text-slate-400">/ 8h</span>
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono-num">
                                    {prodHrs}h core
                                  </span>
                                </div>

                                {/* Shift progress bar */}
                                <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                  <div
                                    className="h-full bg-emerald-500 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, Math.round((totMins / 480) * 100))}%` }}
                                  />
                                </div>

                                <p className="text-[10px] font-medium text-slate-700 dark:text-slate-300 truncate leading-tight mt-0.5">
                                  {primaryEntry.taskTitle}
                                </p>
                                
                                {primaryEntry.project && (
                                  <span className="inline-block text-[9px] font-semibold text-purple-600 dark:text-purple-400 truncate max-w-full">
                                    [{primaryEntry.project.code}]
                                  </span>
                                )}
                              </div>
                            ) : !isFuture && !isSatSun ? (
                              <div className="text-center py-1">
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-rose-100/70 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400">
                                  Missing Log
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenAddDrawer();
                                    setLogDate(dateStr);
                                  }}
                                  className="w-full mt-1.5 py-1 px-1.5 rounded-lg text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 transition flex items-center justify-center gap-1 shadow-2xs"
                                >
                                  <Plus className="w-2.5 h-2.5" />
                                  <span>Log Work</span>
                                </button>
                              </div>
                            ) : isSatSun ? (
                              <div className="text-center py-1">
                                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                  Weekly Off
                                </span>
                              </div>
                            ) : (
                              <div className="text-center py-1">
                                <span className="text-[10px] font-medium text-slate-300 dark:text-slate-600">
                                  Upcoming
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Bottom: Status Pill / Quick Actions */}
                          {hasEntries && (
                            <div className="pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px]">
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Logged</span>
                              </span>

                              <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(primaryEntry)}
                                  className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                  title="Edit Timesheet"
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTimesheet(primaryEntry.id)}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                  title="Delete Timesheet"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                  </div>
                </div>

                {/* Calendar Legend Strip */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span>Work Logged</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    <span>Today</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <span>Missing Work Log</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                    <span>Weekly Off</span>
                  </span>
                </div>

              </div>

            </div>
          ) : (
            /* ══════════════════════════════════════════════════════════════ */
            /* 4B. TABLE LIST VIEW WITH CONFIGURABLE PAGINATION               */
            /* ══════════════════════════════════════════════════════════════ */
            loading ? (
              <div className="p-16 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                <span>Loading timesheet records...</span>
              </div>
            ) : filteredTimesheets.length === 0 ? (
              <div className="p-16 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No timesheets found</p>
                <p className="mt-1">No logs match the selected filter. Click "+ Log Work Time" to add a new submission.</p>
              </div>
            ) : (
            /* ------------------------------------------------------------- */
            /* 📋 UNIFIED CONTINUOUS TIMESHEET FEED & TABLE */
            /* ------------------------------------------------------------- */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Deliverable & Project</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Duration & Core Hours</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {displayedTimesheets.map(t => {
                      const canModify = t.userId === user?.id || isAdmin;
                      const dObj = new Date(t.logDate + 'T00:00:00');
                      const weekdayStr = dObj.toLocaleDateString('en-US', { weekday: 'short' });
                      const isToday = t.logDate === new Date().toISOString().split('T')[0];

                      return (
                        <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                          {/* Date Chip */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={`px-2.5 py-1 rounded-xl text-center border ${
                                isToday
                                  ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-bold'
                                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}>
                                <span className="text-[10px] uppercase block leading-tight font-semibold text-slate-400">
                                  {weekdayStr}
                                </span>
                                <span className="text-xs font-bold font-mono-num leading-tight">
                                  {t.logDate.slice(8, 10)} {dObj.toLocaleDateString('en-US', { month: 'short' })}
                                </span>
                              </div>
                              {isToday && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-600 text-white">
                                  TODAY
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Deliverable & Project */}
                          <td className="py-3.5 px-3 max-w-sm">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <strong className="text-slate-900 dark:text-white truncate">
                                  {t.taskTitle}
                                </strong>
                                {t.isBillable && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                    Billable
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md">
                                {t.activityDescription}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                {t.project ? (
                                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                                    [{t.project.code}] {t.project.name}
                                  </span>
                                ) : (
                                  <span>General Initiative</span>
                                )}
                                {t.user && activeTab !== 'MY' && (
                                  <>
                                    <span>•</span>
                                    <span>By: <strong className="text-slate-700 dark:text-slate-300">{t.user.firstName} {t.user.lastName}</strong></span>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category Badge */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {getCategoryBadge(t.activityType || 'DEVELOPMENT')}
                          </td>

                          {/* Hours Logged with Progress */}
                          <td className="py-3.5 px-3 font-mono-num whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <strong className="text-slate-900 dark:text-white text-xs">
                                  {(t.productiveMinutes / 60).toFixed(1)}h
                                </strong>
                                <span className="text-slate-400 text-[10px]">
                                  / {(t.totalMinutes / 60).toFixed(1)}h shift
                                </span>
                              </div>
                              <div className="w-24 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full"
                                  style={{
                                    width: `${Math.min(100, Math.round(((t.productiveMinutes || 0) / (t.totalMinutes || 1)) * 100))}%`
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            {getStatusBadge(t.status)}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewingTimesheet(t)}
                                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                title="View Scope Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {canModify && (
                                <>
                                  <button
                                    onClick={() => handleStartEdit(t)}
                                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition"
                                    title="Edit Timesheet"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTimesheet(t.id)}
                                    disabled={deletingId === t.id}
                                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination Controls Toolbar ── */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                <div className="text-slate-500 dark:text-slate-400 font-medium">
                  Showing <span className="font-bold text-slate-800 dark:text-slate-200 font-mono-num">{totalEntries > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono-num">{Math.min(currentPage * pageSize, totalEntries)}</span> of{' '}
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono-num">{totalEntries}</span> entries
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Dynamic Page Buttons */}
                  {Array.from({ length: Math.min(5, calculatedTotalPages) }, (_, i) => {
                    let pNum = i + 1;
                    if (calculatedTotalPages > 5) {
                      if (currentPage > 3 && currentPage < calculatedTotalPages - 1) {
                        pNum = currentPage - 2 + i;
                      } else if (currentPage >= calculatedTotalPages - 1) {
                        pNum = calculatedTotalPages - 4 + i;
                      }
                    }
                    return (
                      <button
                        key={pNum}
                        onClick={() => handlePageChange(pNum)}
                        className={`min-w-[32px] h-8 rounded-lg text-xs font-bold transition font-mono-num ${
                          currentPage === pNum
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= calculatedTotalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handlePageChange(calculatedTotalPages)}
                    disabled={currentPage >= calculatedTotalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          )
        )}

        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5. FULL-SCREEN DEDICATED PAGE: ADD / EDIT WORK LOG */}
      {/* ------------------------------------------------------------- */}
      {isLogDrawerOpen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-50 dark:bg-slate-950 flex flex-col w-screen h-screen overflow-hidden animate-in fade-in duration-200">
          
          {/* Top Page Header */}
          <header className="shrink-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 sm:px-8 flex items-center justify-between z-20 shadow-xs">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsLogDrawerOpen(false)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span>Back to Timesheets</span>
              </button>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <span className="text-slate-400">Timesheets</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {editingTimesheetId ? 'Edit Work Log' : 'New Daily Time Entry'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 rounded-full text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>Active Date: {logDate}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsLogDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Body: 2-Column Responsive Workspace */}
          <form onSubmit={handleSubmitTimesheet} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8">
                
                {/* Hero Title Banner */}
                <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center font-bold shadow-inner">
                        <Briefcase className="w-7 h-7" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                            {editingTimesheetId ? 'Edit Daily Work Log' : 'Log Daily Work & Time Entry'}
                          </h1>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Full Page Workspace
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-indigo-200/70 mt-1">
                          Record work duration window, project deliverables, and productive hours for audit compliance
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main 2-Column Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column (8 cols): Form Fields */}
                  <div className="lg:col-span-8 space-y-6">
                    
                    {/* Inline Error Banner */}
                    {logSubmitError && (
                      <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                        <span className="font-semibold">{logSubmitError}</span>
                      </div>
                    )}

                    {/* Timeline & Project Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        <span>Timeline & Project Assignment</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                            Log Date <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="date"
                            value={logDate}
                            onChange={(e) => setLogDate(e.target.value)}
                            required
                            className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500/30"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                            Assigned Project
                          </label>
                          <CustomSelect
                            value={projectId}
                            onChange={(val) => setProjectId(val)}
                            placeholder="Select a project or initiative..."
                            options={[
                              { value: '', label: 'General / Non-Project Deliverable', sublabel: 'Internal tasks and operations' },
                              ...projects.map((p) => ({
                                value: p.id,
                                label: `[${p.code}] ${p.name}`,
                                sublabel: p.clientName ? `Client: ${p.clientName}` : undefined,
                                badge: p.code,
                                badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                              }))
                            ]}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Duration Window Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-500" />
                        <span>Work Duration Window</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                            Start Time (From) <span className="text-rose-500">*</span>
                          </label>
                          <CustomTimePicker
                            value={startTime}
                            onChange={(val) => setStartTime(val)}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                            End Time (To) <span className="text-rose-500">*</span>
                          </label>
                          <CustomTimePicker
                            value={endTime}
                            onChange={(val) => setEndTime(val)}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                            Break / Lunch
                          </label>
                          <CustomSelect
                            value={breakMinutes}
                            onChange={(val) => setBreakMinutes(Number(val))}
                            options={[
                              { value: 0, label: 'No Break (0 mins)' },
                              { value: 15, label: '15 mins' },
                              { value: 30, label: '30 mins (Standard)' },
                              { value: 45, label: '45 mins' },
                              { value: 60, label: '1 Hour (60 mins)' },
                              { value: 90, label: '1.5 Hours' },
                            ]}
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-medium">Logged Span:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{timeComputed.totalHrs} Hours</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-medium">Productive Output:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{timeComputed.prodHrs} Hours</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-medium">Break Deducted:</span>
                          <span className="font-semibold text-amber-600 dark:text-amber-400 font-mono">{breakMinutes} mins</span>
                        </div>
                      </div>
                    </div>

                    {/* Deliverables & Activities Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-500" />
                        <span>Work Deliverables & Scope</span>
                      </h3>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                          Primary Deliverable / Milestone <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={taskTitle}
                          onChange={(e) => {
                            setTaskTitle(e.target.value);
                            if (logSubmitError) setLogSubmitError(null);
                          }}
                          placeholder="e.g. Implemented Microservice Authentication & Multi-tier RBAC Filters"
                          required
                          className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500/30"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                          Detailed Work Breakdown (Scope, PRs, Modules) <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={5}
                          value={activityDescription}
                          onChange={(e) => {
                            setActivityDescription(e.target.value);
                            if (logSubmitError) setLogSubmitError(null);
                          }}
                          placeholder="Detail completed modules, tickets resolved, PR numbers, architectural decisions, meetings attended..."
                          required
                          className="w-full p-4 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 leading-relaxed focus:ring-2 focus:ring-indigo-500/30 font-sans"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center pt-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                            Activity Category
                          </label>
                          <CustomSelect
                            value={activityType}
                            onChange={(val) => setActivityType(val)}
                            options={[
                              { value: 'DEVELOPMENT', label: 'Feature Development' },
                              { value: 'CODE_REVIEW', label: 'Code Review & PRs' },
                              { value: 'BUG_FIXING', label: 'Bug Fixing & QA' },
                              { value: 'MEETING', label: 'Client/Team Meeting' },
                              { value: 'DOCUMENTATION', label: 'Tech Documentation' },
                              { value: 'SUPPORT', label: 'Ops & Support' },
                            ]}
                          />
                        </div>

                        <div className="flex items-center pt-5">
                          <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-full text-xs font-semibold text-slate-800 dark:text-slate-200">
                            <input
                              type="checkbox"
                              checked={isBillable}
                              onChange={(e) => setIsBillable(e.target.checked)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>Client Billable Deliverable</span>
                          </label>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Right Column (4 cols): Live Compliance & Policy Sidebar */}
                  <div className="lg:col-span-4 space-y-6">
                    
                    {/* Live Efficiency & Summary Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          Time Summary
                        </h4>
                        <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                          {logDate}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Gross Window:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{timeComputed.totalHrs} hrs</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Break / Intermission:</span>
                          <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{breakMinutes} mins</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Productive Hours:</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{timeComputed.prodHrs} hrs</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Billing Classification:</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isBillable
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {isBillable ? 'Billable Client' : 'Internal Overhead'}
                          </span>
                        </div>
                      </div>

                      {/* Productivity Progress Bar */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">Daily Target (8.0h)</span>
                          <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {Math.min(100, Math.round((Number(timeComputed.prodHrs) / 8.0) * 100))}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, (Number(timeComputed.prodHrs) / 8.0) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Policy Compliance Reminders */}
                    <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 p-6 space-y-4">
                      <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider">
                        <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Corporate Logging Policy</span>
                      </div>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2.5">
                        <li className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <span>Submit work logs before 23:59 on the same working day.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <span>Ensure project codes match your Jira or sprint deliverables.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <span>Billable hours are audited weekly by project managers.</span>
                        </li>
                      </ul>
                    </div>

                  </div>

                </div>

                {/* Sticky Action Bar */}
                <div className="sticky bottom-6 z-30 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setIsLogDrawerOpen(false)}
                    disabled={isSubmittingLog}
                    className="px-5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                  >
                    Cancel & Return
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingLog}
                    className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/30 transition transform active:scale-95 disabled:opacity-50"
                  >
                    {isSubmittingLog ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Time Log...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>{editingTimesheetId ? 'Update Work Log' : 'Submit Daily Timesheet'}</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          </form>
        </div>,
        document.body
      )}

      {/* ------------------------------------------------------------- */}
      {/* 6. FULL-SCREEN DEDICATED PAGE: VIEW FULL TIMESHEET DETAILS */}
      {/* ------------------------------------------------------------- */}
      {viewingTimesheet && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-50 dark:bg-slate-950 flex flex-col w-screen h-screen overflow-hidden animate-in fade-in duration-200">
          
          {/* Top Page Header */}
          <header className="shrink-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 sm:px-8 flex items-center justify-between z-20 shadow-xs">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setViewingTimesheet(null)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span>Back to Timesheets</span>
              </button>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
              <div className="hidden sm:flex items-center gap-2 text-xs">
                <span className="text-slate-400">Timesheets</span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">Activity Dossier</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 rounded-full text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                <span>Log Date: {viewingTimesheet.logDate}</span>
              </div>
              <button
                type="button"
                onClick={() => setViewingTimesheet(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto w-full px-6 py-8 space-y-8">
              
              {/* Hero Title Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center font-bold shadow-inner">
                      <Briefcase className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                          {viewingTimesheet.taskTitle}
                        </h1>
                        <div className="scale-90 origin-left">
                          {getStatusBadge(viewingTimesheet.status)}
                        </div>
                      </div>
                      <p className="text-xs sm:text-sm text-indigo-200/70 mt-1">
                        Activity logged on {viewingTimesheet.logDate} &bull; Recorded by {viewingTimesheet.user ? `${viewingTimesheet.user.firstName} ${viewingTimesheet.user.lastName}` : 'Employee'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column (8 cols): Activity Details */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Scope & Breakdown Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      <span>Full Scope & Work Breakdown</span>
                    </h3>
                    <p className="p-5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 text-xs whitespace-pre-wrap leading-relaxed font-sans">
                      {viewingTimesheet.activityDescription}
                    </p>
                  </div>

                  {/* Project & Client Card */}
                  {viewingTimesheet.project && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-indigo-500" />
                        <span>Project Association</span>
                      </h3>
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Enterprise Project</span>
                          <strong className="text-sm text-slate-800 dark:text-slate-200 font-bold">
                            [{viewingTimesheet.project.code}] {viewingTimesheet.project.name}
                          </strong>
                        </div>
                        {viewingTimesheet.project.clientName && (
                          <div className="sm:text-right">
                            <span className="text-[11px] text-slate-400 block font-medium">Contracted Client</span>
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {viewingTimesheet.project.clientName}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>

                {/* Right Column (4 cols): Metrics & Audit Dossier */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800">
                      Audit Metrics
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
                        <span className="text-[10px] text-slate-400 block font-medium">Total Duration</span>
                        <strong className="text-base text-slate-800 dark:text-slate-200 font-mono font-bold">
                          {(viewingTimesheet.totalMinutes / 60).toFixed(1)}h
                        </strong>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-center">
                        <span className="text-[10px] text-slate-400 block font-medium">Productive</span>
                        <strong className="text-base text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                          {(viewingTimesheet.productiveMinutes / 60).toFixed(1)}h
                        </strong>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Activity Classification:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {viewingTimesheet.activityType || 'DEVELOPMENT'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Billable to Client:</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          viewingTimesheet.isBillable
                            ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {viewingTimesheet.isBillable ? 'Yes · Billable' : 'No · Non-billable'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Submitted On:</span>
                        <span className="font-mono text-slate-600 dark:text-slate-400">
                          {new Date(viewingTimesheet.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 p-6 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Approval Status</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {viewingTimesheet.status === 'APPROVED' && 'This work log has been reviewed and approved by the reporting manager.'}
                      {viewingTimesheet.status === 'PENDING' && 'This entry is awaiting weekly sprint sign-off by the reporting manager.'}
                      {viewingTimesheet.status === 'REJECTED' && 'This work log was rejected during audit. Please review notes or re-submit.'}
                    </p>
                  </div>
                </div>

              </div>

              {/* Action Bar */}
              <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setViewingTimesheet(null)}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-600/30"
                >
                  Close Dossier
                </button>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ------------------------------------------------------------- */}
      {/* 7. EMPLOYEE 360° ACTIVITY DOSSIER DRAWER (ADMIN/MANAGER) */}
      {/* ------------------------------------------------------------- */}
      <EmployeeDetailDrawer
        userId={selected360UserId}
        isOpen={!!selected360UserId}
        onClose={() => setSelected360UserId(null)}
      />

      {/* 8. DELETE WORK LOG CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={!!deleteConfirmId}
        title="Delete Timesheet Entry"
        message="Are you sure you want to delete this daily work log? This action is permanent and cannot be reversed."
        confirmText="Yes, Delete Log"
        cancelText="Cancel"
        variant="danger"
        isLoading={!!deletingId}
        onConfirm={executeDeleteTimesheet}
        onCancel={() => setDeleteConfirmId(null)}
      />

    </div>
  );
};
