import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  X,
  User,
  Mail,
  Briefcase,
  Building2,
  Sparkles,
  Loader2,
  Calendar,
  Clock,
  CheckCircle2,
  ListTodo,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import api from '../services/api';
import { formatShiftWindow, formatTime12 } from '../utils/timeUtils';

interface EmployeeDetailDrawerProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EmployeeDetailDrawer: React.FC<EmployeeDetailDrawerProps> = ({ userId, isOpen, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TIMESHEETS' | 'TASKS' | 'ATTENDANCE' | 'LEAVES'>('OVERVIEW');

  useEffect(() => {
    if (isOpen && userId) {
      fetch360Data(userId);
    }
  }, [isOpen, userId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetch360Data = async (id: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/employees/${id}/360`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch 360 data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const profile = data?.profile;
  const metrics = data?.metrics;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] bg-slate-50 dark:bg-slate-950 flex flex-col overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      {/* 1. Top Sticky Navigation Bar */}
      <header className="sticky top-0 z-20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Directory</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span>Employees</span>
            <span>/</span>
            <span>360° Dossier</span>
            <span>/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {profile ? `${profile.firstName} ${profile.lastName}` : 'Loading...'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-block text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md font-mono">
            ESC to close
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. Hero Profile Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-900/50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {loading || !profile ? (
            <div className="flex items-center justify-center gap-3 py-12">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <span className="text-sm font-semibold text-slate-300">Loading Employee 360° Profile...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Badge & Meta */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>360° Employee Dossier</span>
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    profile.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                    profile.status === 'INVITED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                    'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {profile.status}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-300 border border-white/10">
                    Role: {profile.role}
                  </span>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Joined: {profile.joiningDate || (profile.createdAt ? new Date(profile.createdAt).toISOString().split('T')[0] : '2026-01-15')}</span>
                </div>
              </div>

              {/* Main Profile Info Row */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl bg-indigo-600 border-2 border-indigo-400/40 overflow-hidden flex items-center justify-center text-white font-black text-2xl shadow-xl shrink-0">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.firstName} className="w-full h-full object-cover" />
                    ) : (
                      <span>{profile.firstName?.[0]}{profile.lastName?.[0]}</span>
                    )}
                  </div>

                  <div>
                    <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                      {profile.firstName} {profile.lastName}
                    </h1>
                    <div className="flex items-center flex-wrap gap-2 text-sm text-indigo-200/90 mt-1">
                      <span className="font-semibold">{profile.designation}</span>
                      <span>&bull;</span>
                      <span className="font-mono text-indigo-300 bg-indigo-900/60 px-2 py-0.5 rounded border border-indigo-700/50">
                        {profile.employeeCode}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <Building2 className="w-3.5 h-3.5" />
                        {profile.department?.name || 'General Department'}
                      </span>
                    </div>

                    <div className="flex items-center flex-wrap gap-4 text-xs text-slate-400 mt-2">
                      <span className="flex items-center gap-1.5 hover:text-slate-200 transition">
                        <Mail className="w-3.5 h-3.5 text-indigo-400" />
                        {profile.email}
                      </span>
                      {profile.phone && (
                        <span>&bull; Tel: {profile.phone}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick KPI Stats Cards Grid */}
              {metrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-indigo-900/60">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                      <span>Productivity</span>
                      <TrendingUp className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                      {metrics.avgProductivityPercent}%
                    </div>
                    <span className="text-[11px] text-slate-400">Average verified output</span>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                      <span>Logged Work</span>
                      <Clock className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div className="text-2xl font-black text-white font-mono mt-1">
                      {metrics.totalLoggedHours} <span className="text-sm font-normal text-slate-400">hrs</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Total timesheet entries</span>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                      <span>Tasks Finished</span>
                      <CheckCircle2 className="w-4 h-4 text-indigo-300" />
                    </div>
                    <div className="text-2xl font-black text-indigo-300 font-mono mt-1">
                      {metrics.completedTasks} / {metrics.totalTasksAssigned}
                    </div>
                    <span className="text-[11px] text-slate-400">Operational tasks</span>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
                      <span>Attendance Days</span>
                      <Calendar className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="text-2xl font-black text-purple-300 font-mono mt-1">
                      {metrics.attendanceDays} <span className="text-sm font-normal text-slate-400">days</span>
                    </div>
                    <span className="text-[11px] text-slate-400">Punches on record</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. Full-Width Sticky Tab Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-12 z-10">
        <div className="max-w-7xl mx-auto px-6 flex gap-3 overflow-x-auto">
          {[
            { id: 'OVERVIEW', label: 'Overview & Hierarchy', icon: User },
            { id: 'TIMESHEETS', label: `Daily Work Logs (${profile?.dailyTimesheets?.length || 0})`, icon: Clock },
            { id: 'TASKS', label: `Assigned Tasks (${profile?.assignedTasks?.length || 0})`, icon: ListTodo },
            { id: 'ATTENDANCE', label: `Attendance Punches (${profile?.attendances?.length || 0})`, icon: Calendar },
            { id: 'LEAVES', label: `Leave Quotas & Balances (${profile?.leaveBalances?.length || 0})`, icon: FileSpreadsheet }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Full-Page Spacious Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-8 space-y-6">
        {loading || !profile ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
            <p className="text-xs">Aggregating full dossier data...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: OVERVIEW & HIERARCHY */}
            {activeTab === 'OVERVIEW' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Organizational Specs */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Organizational Hierarchy & Shift Specifications
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-400 block text-[11px] font-medium">Reporting Manager</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block text-sm">
                        {profile.reportingManager
                          ? `${profile.reportingManager.firstName} ${profile.reportingManager.lastName}`
                          : 'Executive Leadership / Board'}
                      </span>
                      {profile.reportingManager?.designation && (
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {profile.reportingManager.designation}
                        </span>
                      )}
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-400 block text-[11px] font-medium">Assigned Shift Window</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block text-sm font-mono">
                        {formatShiftWindow(profile.shiftStartTime, profile.shiftEndTime)}
                      </span>
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold block mt-0.5">
                        15 mins Grace Period Active
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-400 block text-[11px] font-medium">Date of Joining</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200 mt-0.5 block text-sm font-mono">
                        {profile.joiningDate || (profile.createdAt ? new Date(profile.createdAt).toISOString().split('T')[0] : '2026-01-15')}
                      </span>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-slate-400 block text-[11px] font-medium">Employment Status</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block text-sm">
                        Full-Time / Regular Payroll
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Team Members & Contact */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                      Direct Team Members & Contact Channels
                    </h3>
                  </div>

                  {profile.reportees && profile.reportees.length > 0 ? (
                    <div className="space-y-3">
                      <span className="text-xs text-slate-400 font-medium">
                        Direct Reportees ({profile.reportees.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {profile.reportees.map((rep: any) => (
                          <div
                            key={rep.id}
                            className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-center gap-3"
                          >
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0">
                              {rep.firstName?.[0] || 'U'}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                                {rep.firstName} {rep.lastName}
                              </span>
                              <span className="text-[11px] text-slate-400 block truncate">
                                {rep.designation || 'Team Member'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                      This staff member does not have direct reportees assigned (Individual Contributor).
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: DAILY TIMESHEETS & PRODUCTIVITY */}
            {activeTab === 'TIMESHEETS' && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Daily Work Deliverables & Productive Hours
                    </h3>
                    <p className="text-xs text-slate-500">
                      Work logs are log-only and compliant with organization timesheet governance.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                    Total {profile.dailyTimesheets?.length || 0} entries
                  </span>
                </div>

                {profile.dailyTimesheets?.length === 0 ? (
                  <div className="text-center py-16 text-xs text-slate-400">
                    No daily timesheets submitted yet by this employee.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {profile.dailyTimesheets.map((t: any) => {
                      const prodPct = t.totalMinutes > 0 ? Math.round((t.productiveMinutes / t.totalMinutes) * 100) : 0;
                      return (
                        <div
                          key={t.id}
                          className="p-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl space-y-3"
                        >
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                  {t.taskTitle}
                                </span>
                                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                  {t.project?.name || 'General Project'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                <span>Date: {t.logDate}</span>
                                <span>&bull;</span>
                                <span>Category: {t.activityType}</span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                                  prodPct >= 85
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                }`}
                              >
                                {prodPct}% Productive
                              </span>
                              <div className="text-xs text-slate-400 font-mono mt-1">
                                {(t.productiveMinutes / 60).toFixed(1)}h / {(t.totalMinutes / 60).toFixed(1)}h logged
                              </div>
                            </div>
                          </div>

                          {t.activityDescription && (
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                              {t.activityDescription}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ASSIGNED KANBAN TASKS */}
            {activeTab === 'TASKS' && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Assigned Operational Tasks
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                    {profile.assignedTasks?.length || 0} tasks
                  </span>
                </div>

                {profile.assignedTasks?.length === 0 ? (
                  <div className="text-center py-16 text-xs text-slate-400">
                    No tasks assigned to this employee yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.assignedTasks.map((tsk: any) => (
                      <div
                        key={tsk.id}
                        className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-xl flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                            {tsk.title}
                          </span>
                          <span className="text-[11px] text-slate-400 block mt-1">
                            Due: {tsk.dueDate || 'N/A'} &bull; Assigned by {tsk.createdBy?.firstName || 'Manager'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                            {tsk.priority}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              tsk.status === 'DONE'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : tsk.status === 'IN_PROGRESS'
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {tsk.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: ATTENDANCE & PUNCHES */}
            {activeTab === 'ATTENDANCE' && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Attendance Punch Ledger
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                    {profile.attendances?.length || 0} recorded punches
                  </span>
                </div>

                {profile.attendances?.length === 0 ? (
                  <div className="text-center py-16 text-xs text-slate-400">
                    No attendance punches recorded for this staff member.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-800 text-[11px]">
                          <th className="pb-3 font-semibold">Date</th>
                          <th className="pb-3 font-semibold">Clock In</th>
                          <th className="pb-3 font-semibold">Clock Out</th>
                          <th className="pb-3 font-semibold">Work Mode</th>
                          <th className="pb-3 font-semibold text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {profile.attendances.map((att: any) => (
                          <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                            <td className="py-3 font-semibold text-slate-900 dark:text-white">
                              {att.attendanceDate}
                            </td>
                            <td className="py-3 font-mono">
                              {formatTime12(att.clockInTime)}
                            </td>
                            <td className="py-3 font-mono">
                              {att.clockOutTime ? (
                                formatTime12(att.clockOutTime)
                              ) : (
                                <span className="text-emerald-500 font-semibold">Active Now</span>
                              )}
                            </td>
                            <td className="py-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {att.workMode || 'OFFICE'}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  att.status === 'PRESENT'
                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                }`}
                              >
                                {att.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: LEAVES & BALANCES */}
            {activeTab === 'LEAVES' && (
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Allocated Leave Quotas & Balances
                  </h3>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                    {profile.leaveBalances?.length || 0} leave types
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profile.leaveBalances?.map((b: any) => {
                    const avail = b.totalAllocated - (b.used + b.pendingApproval);
                    return (
                      <div
                        key={b.id}
                        className="p-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {b.leaveType?.name}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                            {b.leaveType?.code}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                            {avail}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">/ {b.totalAllocated} days available</span>
                        </div>

                        <div className="text-[11px] text-slate-400 flex justify-between pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                          <span>Used: <strong className="text-slate-700 dark:text-slate-300">{b.used}d</strong></span>
                          <span>Pending Approval: <strong className="text-amber-600 dark:text-amber-400">{b.pendingApproval}d</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>,
    document.body
  );
};
