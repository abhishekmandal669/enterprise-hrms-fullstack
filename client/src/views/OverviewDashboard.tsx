import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useAttendance } from '../context/AttendanceContext';
import api from '../services/api';
import { formatTime12 } from '../utils/timeUtils';
import {
  Users,
  Clock,
  CalendarDays,
  Play,
  Square,
  Coffee,
  Building,
  CheckCircle,
  Plus,
  ShieldCheck,
  Home,
  Cake,
  PartyPopper,
  Laptop,
  UserCheck,
  Sparkles,
  Heart,
  Award,
  UserPlus,
  Mail,
  RefreshCw,
  AlertTriangle,
  Briefcase,
  LayoutDashboard,
  Megaphone,
  CheckSquare
} from 'lucide-react';
import { ClockInModal } from '../components/ClockInModal';

const SectionHeader: React.FC<{ label: string; icon: React.ComponentType<{ className?: string }> }> = ({ label, icon: Icon }) => (
  <div className="flex items-center gap-2.5 pt-2 pb-0.5 select-none">
    <div className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
      <Icon className="w-3.5 h-3.5" />
    </div>
    <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
      {label}
    </span>
    <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
  </div>
);

interface OverviewDashboardProps {
  onNavigateToLeaves?: () => void;
  onOpenApplyLeave?: () => void;
  onOpenRegularize?: () => void;
  onOpenCreateTask?: () => void;
  onNavigateToWebmail?: () => void;
  searchQuery?: string;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  onOpenApplyLeave,
  onOpenRegularize,
  onOpenCreateTask,
  onNavigateToWebmail
}) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const {
    punchState,
    workSeconds,
    breakSeconds,
    isLate,
    punchLoading,
    formatTimer,
    clockOut,
    toggleBreak
  } = useAttendance();

  const [dashData, setDashData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clockInModalOpen, setClockInModalOpen] = useState(false);
  const [celebrationTab, setCelebrationTab] = useState<'ANNIVERSARIES' | 'NEW_JOINERS' | 'BIRTHDAYS'>('ANNIVERSARIES');

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/dashboard');
      if (res.data.success) {
        setDashData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard payload:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [user?.role]);

  // Real-time socket delta updates
  useEffect(() => {
    if (!socket) return;
    socket.on('leaves:new_request', () => fetchDashboard());
    socket.on('leaves:status_update', () => fetchDashboard());
    socket.on('attendance:live_update', () => fetchDashboard());
    socket.on('tasks:updated', () => fetchDashboard());
  }, [socket]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Top Hero Station Shimmer Skeleton */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 border border-slate-800 shadow-xl">
          <div className="animate-shimmer absolute inset-0 opacity-20 pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-3 max-w-md">
              <div className="flex items-center gap-2">
                <div className="h-4 w-32 bg-slate-700/60 rounded-full animate-pulse" />
                <div className="h-4 w-24 bg-indigo-500/30 rounded-full animate-pulse" />
              </div>
              <div className="h-7 w-64 bg-slate-700/80 rounded-lg animate-pulse" />
              <div className="flex items-center gap-3 pt-1">
                <div className="h-3 w-28 bg-slate-700/50 rounded-full animate-pulse" />
                <div className="h-3 w-24 bg-slate-700/50 rounded-full animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700/50">
              <div className="space-y-2 text-right pr-2">
                <div className="h-3 w-20 bg-slate-700/60 rounded-full ml-auto animate-pulse" />
                <div className="h-8 w-28 bg-slate-700/80 rounded-lg ml-auto animate-pulse" />
              </div>
              <div className="h-10 w-32 bg-indigo-600/40 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>

        {/* 4 Metric Shimmer Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs"
            >
              <div className="animate-shimmer absolute inset-0 opacity-40 pointer-events-none" />
              <div className="flex items-center justify-between mb-3">
                <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
              <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-lg mb-2 animate-pulse" />
              <div className="h-3 w-36 bg-slate-100 dark:bg-slate-800/60 rounded-md animate-pulse" />
            </div>
          ))}
        </div>

        {/* 2-Column Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 h-64">
              <div className="animate-shimmer absolute inset-0 opacity-40 pointer-events-none" />
              <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded-md mb-4 animate-pulse" />
              <div className="space-y-3">
                <div className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
                <div className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
                <div className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 h-64">
              <div className="animate-shimmer absolute inset-0 opacity-40 pointer-events-none" />
              <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-md mb-4 animate-pulse" />
              <div className="space-y-3">
                <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
                <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
                <div className="h-10 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashData) {
    return (
      <div className="max-w-lg mx-auto my-12 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-center">
        <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-200 dark:border-rose-900">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Operations Feed Synchronizing
        </h3>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Could not establish real-time connection to Nexus operations feed. Please ensure the backend service is running or click retry.
        </p>
        <button
          onClick={() => {
            setLoading(true);
            fetchDashboard();
          }}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const {
    monthSummary,
    leaveBalances,
    tasks,
    announcements,
    upcoming,
    team,
    org,
    onLeaveToday = [],
    workingFromHomeToday = [],
    upcomingBirthdays = [],
    workAnniversaries = [],
    newJoiners = [],
    personalMilestone
  } = dashData;

  return (
    <div className="space-y-6">
      
      {/* ------------------------------------------------------------- */}
      {/* 🌟 TOP HERO PUNCH & DAILY CLOCK-IN STATION (TOP OF DASHBOARD) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-lg border border-indigo-800/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          
          {/* Left: Greeting & Shift Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Daily Workstation & Attendance
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
                dashData?.punch?.workMode === 'REMOTE'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {dashData?.punch?.workMode === 'REMOTE' ? (
                  <>
                    <Home className="w-3 h-3 text-purple-400" />
                    <span>Working From Home (Remote)</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>HQ Geofence Active (Office)</span>
                  </>
                )}
              </span>
            </div>

            <h1 className="text-xl font-bold tracking-tight">
              Welcome, {user?.name}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-xs text-indigo-200/80">
              <span>Shift: <strong>09:00 - 18:00</strong> (15m Grace)</span>
              <span>&bull;</span>
              <span>Designation: <strong>{user?.designation}</strong></span>
              <span>&bull;</span>
              <span>Department: <strong>{user?.department}</strong></span>
            </div>
          </div>

          {/* Right: Prominent Punch Clock Actions — hidden for administrative roles */}
          {!['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN'].includes(user?.role || '') && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-indigo-500/20 backdrop-blur-xs">
              
              {/* Live Stopwatch */}
              <div className="text-left sm:text-right pr-2">
                <div className="text-xs text-indigo-200 font-semibold flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${punchState === 'WORKING' ? 'bg-emerald-400 animate-pulse' : punchState === 'ON_BREAK' ? 'bg-amber-400' : 'bg-slate-400'}`} />
                  <span>
                    {punchState === 'WORKING'
                      ? `WORKING (${isLate ? 'LATE MARK' : 'ON TIME'})`
                      : punchState === 'ON_BREAK'
                      ? 'ON BREAK'
                      : punchState === 'DONE'
                      ? 'SHIFT COMPLETED'
                      : 'NOT CLOCKED IN'}
                  </span>
                </div>
                <div className="text-3xl font-bold font-mono-num tracking-wider text-white mt-0.5">
                  {formatTimer(punchState === 'ON_BREAK' ? breakSeconds : workSeconds)}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {punchState === 'NOT_CLOCKED_IN' ? (
                  <button
                    onClick={() => setClockInModalOpen(true)}
                    disabled={punchLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/30 transition transform active:scale-95 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Clock In Now</span>
                  </button>
                ) : punchState === 'DONE' ? (
                  <div className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold border border-slate-700">
                    Shift Completed
                  </div>
                ) : (
                  <button
                    onClick={clockOut}
                    disabled={punchLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-500/30 transition transform active:scale-95 disabled:opacity-50"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Clock Out</span>
                  </button>
                )}

                <button
                  onClick={toggleBreak}
                  disabled={punchState === 'NOT_CLOCKED_IN' || punchState === 'DONE' || punchLoading}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition ${
                    punchState === 'ON_BREAK'
                      ? 'bg-amber-500 text-white border-amber-400'
                      : 'bg-indigo-950/60 hover:bg-indigo-900 border-indigo-500/30 text-indigo-100 disabled:opacity-40'
                  }`}
                >
                  <Coffee className="w-4 h-4" />
                  <span>{punchState === 'ON_BREAK' ? 'Resume' : 'Break'}</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Quick Station Navigation */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-indigo-800/40 text-xs text-indigo-200">
          {!['ADMIN', 'SUPER_ADMIN', 'HR_ADMIN'].includes(user?.role || '') && (
            <>
              <button onClick={onOpenApplyLeave} className="hover:text-white flex items-center gap-1 font-semibold transition">
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                <span>Apply Leave</span>
              </button>
              <span>&bull;</span>
              <button onClick={onOpenRegularize} className="hover:text-white flex items-center gap-1 font-semibold transition">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Missed Punch Regularization</span>
              </button>
              <span>&bull;</span>
            </>
          )}
          <button onClick={onOpenCreateTask} className="hover:text-white flex items-center gap-1 font-semibold transition">
            <Plus className="w-3.5 h-3.5 text-indigo-400" />
            <span>New Operational Task</span>
          </button>
          {onNavigateToWebmail && (
            <>
              <span>&bull;</span>
              <button onClick={onNavigateToWebmail} className="hover:text-white flex items-center gap-1 font-semibold transition">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <span>Company Webmail</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ============================================================= */}
      {/* 1. SECTION: DAILY WORKSPACE & PERFORMANCE                     */}
      {/* ============================================================= */}
      <SectionHeader label="Daily Workspace & Performance Snapshot" icon={LayoutDashboard} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Monthly Attendance Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Monthly Attendance</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono-num">
            {monthSummary.attendancePercent}%
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            {monthSummary.present} Present Days Recorded
          </div>
        </div>

        {/* Metric 2: Total Logged Hours */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Logged Hours</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono-num">
            {monthSummary.totalHours}h
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {monthSummary.avgHoursPerDay}h daily average
          </div>
        </div>

        {/* Metric 3: Late Arrivals */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Late Arrivals</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono-num">
            {monthSummary.late}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            15-minute grace window active
          </div>
        </div>

        {/* Metric 4: Shift & Geofence Mode */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Today's Work Mode</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white truncate">
            {dashData?.punch?.workMode === 'REMOTE' ? 'Remote (WFH)' : 'On-Site HQ'}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            Standard Shift: 09:00 - 18:00
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 2. SECTION: TEAM PRESENCE & CELEBRATIONS                      */}
      {/* ============================================================= */}
      <SectionHeader label="Team Presence & Culture Celebrations" icon={Users} />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* 1. 🏠 Working From Home (WFH) Today */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>Working From Home</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                      {workingFromHomeToday.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Active remote VPN sessions today</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {workingFromHomeToday.length === 0 ? (
                <div className="text-center py-7 px-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
                  <Laptop className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No remote sessions today</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">All active colleagues are working from HQ office.</p>
                </div>
              ) : (
                workingFromHomeToday.map((a: any) => (
                  <div
                    key={a.id || a.userId}
                    className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl flex items-center justify-between hover:border-purple-300 dark:hover:border-purple-800 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative">
                        <img
                          src={a.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-purple-400/30"
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                      </div>
                      <div>
                        <strong className="block text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {a.name}
                        </strong>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span>{a.designation}</span>
                          <span>&bull;</span>
                          <span className="text-purple-600 dark:text-purple-400 font-medium">{a.department}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 block">
                        WFH
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block font-mono-num">
                        In: {formatTime12(a.clockInTime)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Presence Synced
            </span>
            <span className="text-purple-600 dark:text-purple-400 font-semibold">Remote Roster</span>
          </div>
        </div>

        {/* 2. 🏖️ On Leave Today (Who's Away Today) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                  <CalendarDays className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>On Leave Today</span>
                    <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                      {onLeaveToday.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Approved employee leaves for today</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {onLeaveToday.length === 0 ? (
                <div className="text-center py-7 px-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
                  <UserCheck className="w-6 h-6 text-emerald-500 dark:text-emerald-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Full Team Attendance Today</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Nobody is on approved leave today.</p>
                </div>
              ) : (
                onLeaveToday.map((l: any) => (
                  <div
                    key={l.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl flex items-center justify-between hover:border-amber-300 dark:hover:border-amber-800 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={l.avatarUrl || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120'}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover ring-2 ring-amber-400/30"
                      />
                      <div>
                        <strong className="block text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {l.name}
                        </strong>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <span>{l.designation}</span>
                          <span>&bull;</span>
                          <span className="text-amber-600 dark:text-amber-400 font-medium">{l.department}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 block">
                        {l.leaveType}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {l.isHalfDay ? `Half Day (${l.halfDaySlot || '1st'})` : `${l.durationDays}d Full Day`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Staffing & Availability</span>
            <button onClick={onOpenApplyLeave} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
              Apply Leave &rarr;
            </button>
          </div>
        </div>

        {/* 3. 🎉 Company Celebrations & Milestones Hub */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header with Title & Tab Selectors */}
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800 mb-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/10 to-rose-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <PartyPopper className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Celebrations & Milestones</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    </h3>
                    <p className="text-[11px] text-slate-400">Anniversaries, new joiners & birthdays</p>
                  </div>
                </div>
              </div>

              {/* 3 Interactive Category Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                <button
                  onClick={() => setCelebrationTab('ANNIVERSARIES')}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10.5px] font-bold transition flex items-center justify-center gap-1 ${
                    celebrationTab === 'ANNIVERSARIES'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Award className="w-3 h-3" />
                  <span>Anniversaries</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-bold">
                    {workAnniversaries.length}
                  </span>
                </button>

                <button
                  onClick={() => setCelebrationTab('NEW_JOINERS')}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10.5px] font-bold transition flex items-center justify-center gap-1 ${
                    celebrationTab === 'NEW_JOINERS'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <UserPlus className="w-3 h-3" />
                  <span>New Joiners</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold">
                    {newJoiners.length}
                  </span>
                </button>

                <button
                  onClick={() => setCelebrationTab('BIRTHDAYS')}
                  className={`flex-1 py-1 px-2 rounded-lg text-[10.5px] font-bold transition flex items-center justify-center gap-1 ${
                    celebrationTab === 'BIRTHDAYS'
                      ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Cake className="w-3 h-3" />
                  <span>Birthdays</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 font-bold">
                    {upcomingBirthdays.length}
                  </span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT 1: WORK ANNIVERSARIES */}
            {celebrationTab === 'ANNIVERSARIES' && (
              <div className="space-y-2.5">
                {workAnniversaries.length === 0 ? (
                  <div className="text-center py-7 px-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
                    <Award className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Anniversaries This Month</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Team service milestones will display here automatically.</p>
                  </div>
                ) : (
                  workAnniversaries.map((a: any) => (
                    <div
                      key={a.userId}
                      className={`p-3 rounded-xl border flex items-center justify-between transition ${
                        a.isToday
                          ? 'bg-gradient-to-r from-amber-50/80 via-yellow-50/50 to-orange-50/80 dark:from-amber-950/40 dark:via-yellow-950/30 dark:to-orange-950/30 border-amber-300 dark:border-amber-800 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 hover:border-amber-200 dark:hover:border-amber-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <img
                            src={a.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'}
                            alt=""
                            className={`w-8 h-8 rounded-full object-cover ring-2 ${a.isToday ? 'ring-amber-500 animate-pulse' : 'ring-amber-400/40'}`}
                          />
                           <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900" />
                        </div>
                        <div>
                          <strong className="block text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {a.name}
                          </strong>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            <span className="font-semibold text-amber-600 dark:text-amber-400">{a.displayYears}</span>
                            <span>&bull;</span>
                            <span>{a.department}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          {a.isToday ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-xs block animate-bounce">
                              Anniversary Today
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 block">
                              {a.displayDate}
                            </span>
                          )}
                        </div>

                        {onNavigateToWebmail && (
                          <button
                            onClick={onNavigateToWebmail}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-slate-700 transition"
                            title="Send Congratulations Email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT 2: NEW JOINERS */}
            {celebrationTab === 'NEW_JOINERS' && (
              <div className="space-y-2.5">
                {newJoiners.length === 0 ? (
                  <div className="text-center py-7 px-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
                    <UserPlus className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No Recent Joiners</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Newly onboarded employees will show up here.</p>
                  </div>
                ) : (
                  newJoiners.map((n: any) => (
                    <div
                      key={n.userId}
                      className="p-3 rounded-xl border bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between hover:border-emerald-300 dark:hover:border-emerald-800 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <img
                            src={n.avatarUrl || 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=120'}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/40"
                          />
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                        </div>
                        <div>
                          <strong className="block text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {n.name}
                          </strong>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                            <span>{n.designation}</span>
                            <span>&bull;</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{n.department}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          {n.joinedLabel}
                        </span>

                        {onNavigateToWebmail && (
                          <button
                            onClick={onNavigateToWebmail}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-700 transition"
                            title="Say Hello / Send Welcome Email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT 3: BIRTHDAYS */}
            {celebrationTab === 'BIRTHDAYS' && (
              <div className="space-y-2.5">
                {upcomingBirthdays.length === 0 ? (
                  <div className="text-center py-7 px-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
                    <PartyPopper className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No birthdays this month</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Check back soon for upcoming celebrations.</p>
                  </div>
                ) : (
                  upcomingBirthdays.map((b: any) => (
                    <div
                      key={b.userId}
                      className={`p-3 rounded-xl border flex items-center justify-between transition ${
                        b.isToday
                          ? 'bg-gradient-to-r from-rose-50/80 via-pink-50/50 to-amber-50/80 dark:from-rose-950/40 dark:via-pink-950/30 dark:to-amber-950/30 border-rose-300 dark:border-rose-800 shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 hover:border-rose-200 dark:hover:border-rose-900/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="relative">
                          <img
                            src={b.avatarUrl || 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=120'}
                            alt=""
                            className={`w-8 h-8 rounded-full object-cover ring-2 ${b.isToday ? 'ring-rose-500 animate-pulse' : 'ring-slate-200 dark:ring-slate-700'}`}
                          />
                          {b.isToday && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 border-2 border-white dark:border-slate-900" />
                          )}
                        </div>
                        <div>
                          <strong className="block text-xs font-bold text-slate-900 dark:text-white leading-tight">
                            {b.name}
                          </strong>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                            <span>{b.department}</span>
                            <span>&bull;</span>
                            <span className="font-semibold text-slate-600 dark:text-slate-300">{b.displayDate}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {b.isToday ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-xs flex items-center gap-1 animate-bounce">
                            <span>Birthday Today</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 block">
                            In {b.daysUntil} {b.daysUntil === 1 ? 'day' : 'days'}
                          </span>
                        )}

                        {onNavigateToWebmail && (
                          <button
                            onClick={onNavigateToWebmail}
                            className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-slate-700 transition"
                            title="Send Birthday Wishes"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
              <span>Acknowledge milestones with your team</span>
            </span>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Culture & Milestones</span>
          </div>
        </div>

      </div>

      {/* ============================================================= */}
      {/* 3. SECTION: DELIVERABLES & SERVICE MILESTONES                 */}
      {/* ============================================================= */}
      <SectionHeader label="Deliverables & Service Journey" icon={CheckSquare} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: My Active Deliverables */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  My Active Deliverables ({tasks.open})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {tasks.overdue > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400">
                    {tasks.overdue} Overdue
                  </span>
                )}
                <button
                  onClick={onOpenCreateTask}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Task</span>
                </button>
              </div>
            </div>

            <div className="space-y-2.5">
              {tasks.top.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">No open deliverables assigned to you.</div>
              ) : (
                tasks.top.map((t: any) => (
                  <div
                    key={t.id}
                    className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <strong className="block text-xs text-slate-900 dark:text-white font-semibold">{t.title}</strong>
                      <span className="text-[10px] text-slate-400">Due: {t.dueDate || 'No Date'} &bull; Status: {t.status}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.priority === 'URGENT' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400'
                    }`}>
                      {t.priority}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Operational Sprint</span>
            <span className="font-semibold text-slate-600 dark:text-slate-300 font-mono-num">
              {tasks.byStatus?.DONE || 0} Tasks Completed
            </span>
          </div>
        </div>

        {/* Card 2: My Service Milestone & Tenure */}
        {personalMilestone && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>My Service Milestone</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    </h3>
                    <p className="text-[11px] text-slate-400">Company tenure & next anniversary milestone</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                    {personalMilestone.milestoneBadge}
                  </span>
                  <span className="text-[11px] text-slate-400 hidden sm:inline">
                    Joined: {personalMilestone.joiningDate}
                  </span>
                </div>
              </div>

              {/* 2-Column Grid inside the card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Current Tenure */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Completed Tenure
                    </span>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                      {personalMilestone.tenureDisplay}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5">
                    {personalMilestone.years > 0
                      ? `You have dedicated ${personalMilestone.totalTenureDays} days of valuable contributions to Nexus.`
                      : `Welcome to the beginning of your career journey at Nexus.`}
                  </p>
                </div>

                {/* Right: Next Milestone Progress */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Next Milestone
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        {personalMilestone.daysUntilNextMilestone === 0
                          ? 'Milestone Today'
                          : `${personalMilestone.daysUntilNextMilestone} Days Remaining`}
                      </span>
                    </div>
                    <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                      {personalMilestone.nextMilestoneLabel}
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 rounded-full transition-all duration-700"
                        style={{ width: `${personalMilestone.progressPercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Target Date: {personalMilestone.targetDate}</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono-num">
                        {personalMilestone.progressPercent}% Completed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Nexus Career Milestones</span>
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{personalMilestone.milestoneBadge}</span>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================= */}
      {/* 4. SECTION: TEAM & ORGANIZATION OVERSIGHT (ADMIN & MANAGERS) */}
      {/* ============================================================= */}
      {(org || team) && (
        <div className="space-y-4">
          <SectionHeader label="Team & Organization Oversight" icon={ShieldCheck} />

          {/* Admin 360 View */}
          {org && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold">Total Headcount</span>
                    <Users className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono-num">{org.headcount.total}</div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-1">
                    {org.headcount.active} Active &bull; {org.headcount.probation} Probation &bull; {org.headcount.pendingInvites} Invites
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold">Today's Attendance</span>
                    <Clock className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono-num">{org.attendance.percent}%</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {org.attendance.present} Present &bull; {org.attendance.late} Late &bull; {org.attendance.wfh} Remote
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold">Pending Approvals</span>
                    <CalendarDays className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono-num">{org.approvals.total}</div>
                  <div className="text-[11px] text-amber-600 font-medium mt-1">Requires managerial action across org</div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-semibold">Task Throughput</span>
                    <CheckCircle className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono-num">{org.tasks.completionRate}%</div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {org.tasks.open} Open &bull; {org.tasks.overdue} Overdue
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Department Attendance Breakdown</h3>
                  </div>
                  <span className="text-xs text-slate-400">{org.departments.length} Divisions Active</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase">
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Headcount</th>
                        <th className="py-2.5 px-3">Present Today</th>
                        <th className="py-2.5 px-3">Attendance Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {org.departments.map((d: any) => (
                        <tr key={d.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                          <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">{d.name}</td>
                          <td className="py-3 px-3 text-slate-500">{d.size} Members</td>
                          <td className="py-3 px-3 text-slate-800 dark:text-slate-100 font-mono-num">{d.present}</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${d.attendancePercent}%` }} />
                              </div>
                              <span className="font-bold text-slate-900 dark:text-white font-mono-num">{d.attendancePercent}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Manager Team View */}
          {team && !org && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500">Present Today</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white font-mono-num mt-1">
                    {team.present} / {team.size}
                  </div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-1">{team.presentPercent}% presence</div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500">Late Arrivals</span>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono-num mt-1">
                    {team.late}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Past 09:15 AM grace</div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500">Pending Approvals</span>
                  <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 font-mono-num mt-1">
                    {team.pendingApprovals.total}
                  </div>
                  <div className="text-[11px] text-rose-600 font-medium mt-1">
                    {team.pendingApprovals.leave} Leaves &bull; {team.pendingApprovals.regularization} Regs
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
                  <span className="text-xs font-semibold text-slate-500">Team Deliverables</span>
                  <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 font-mono-num mt-1">
                    {team.taskBoard.inProgress} Active
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {team.taskBoard.todo} To Do &bull; {team.taskBoard.overdue} Overdue
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Live Team Presence Roster</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase">
                        <th className="py-2.5 px-3">Member</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Clock In</th>
                        <th className="py-2.5 px-3">Active Deliverables</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {team.roster.map((m: any) => (
                        <tr key={m.userId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <img src={m.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'} alt="" className="w-7 h-7 rounded-full object-cover" />
                              <div>
                                <strong className="block text-slate-800 dark:text-slate-100 font-semibold">{m.name}</strong>
                                <span className="text-[10px] text-slate-400">{m.designation}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              m.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                              m.status === 'LATE' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                              m.status === 'ON_BREAK' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400' :
                              'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {m.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono-num text-slate-600 dark:text-slate-300">{m.clockIn}</td>
                          <td className="py-3 px-3 text-indigo-600 dark:text-indigo-400 font-bold">{m.openTasks} Tasks Assigned</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* 5. SECTION: COMMUNICATION & SCHEDULE                         */}
      {/* ============================================================= */}
      <SectionHeader label="Communication & Organization Schedule" icon={Megaphone} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Leave Quota Balances */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Leave Quota Balances</h3>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">2026 Annual Quota</span>
            </div>

            <div className="space-y-3">
              {leaveBalances.map((bal: any) => (
                <div key={bal.code} className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 rounded-xl">
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-800 dark:text-slate-200">{bal.type}</span>
                    <span className="text-slate-900 dark:text-white font-bold">{bal.available} / {bal.allocated} Available</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${(bal.available / bal.allocated) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Quota Compliance</span>
            <button onClick={onOpenApplyLeave} className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
              Apply Leave &rarr;
            </button>
          </div>
        </div>

        {/* Card 2: Corporate Notices & Upcoming Holidays */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            {/* Notices Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Corporate Notices</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">{announcements.length} Published</span>
            </div>

            <div className="space-y-2 mb-4">
              {announcements.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">No active corporate announcements.</div>
              ) : (
                announcements.map((a: any) => (
                  <div key={a.id} className="p-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 rounded-xl flex items-center justify-between">
                    <div>
                      <strong className="block text-xs text-slate-900 dark:text-white font-semibold">{a.title}</strong>
                      <span className="text-[10px] text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {a.priority || 'OFFICIAL'}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Upcoming Holidays Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 mb-2.5">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Upcoming Holidays</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">Gazetted Calendar</span>
            </div>

            <div className="space-y-1.5">
              {upcoming.map((u: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{u.label}</span>
                  <span className="font-mono text-[11px] text-slate-400">{u.date}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Corporate Communications</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">Official Feed</span>
          </div>
        </div>
      </div>

      <ClockInModal
        isOpen={clockInModalOpen}
        onClose={() => {
          setClockInModalOpen(false);
          fetchDashboard();
        }}
        userName={user?.name}
      />

    </div>
  );
};
