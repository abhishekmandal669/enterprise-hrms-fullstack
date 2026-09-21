import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { RegularizationModal } from '../components/RegularizationModal';
import {
  Download, Filter, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Building2, Home, AlertCircle, CalendarDays, X, Calendar as CalendarIcon,
  Coffee, Sparkles, MapPin
} from 'lucide-react';
import { PaginationControls } from '../components/PaginationControls';
import { CustomSelect } from '../components/CustomSelect';

// ─── Types ───────────────────────────────────────────────────────────────────
interface AttendanceBreak {
  id: string;
  breakType: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
}

interface TimesheetRecord {
  id: string;
  attendanceDate: string;   // "YYYY-MM-DD"
  clockInTime: string;
  clockOutTime?: string;
  clockInIp?: string;
  clockOutIp?: string;
  totalWorkMinutes: number;
  totalBreakMinutes?: number;
  workMode?: string;
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT';
  isRegularized?: boolean;
  regularizationRemarks?: string;
  breaks?: AttendanceBreak[];
}

interface HolidayRecord {
  id: string;
  date: string;
  name: string;
  isOptional: boolean;
}

interface LeaveRecord {
  id: string;
  fromDate: string;
  toDate: string;
  status: string;
  leaveType: {
    code: string;
    name: string;
  };
}

interface MonthSummary {
  totalDaysInMonth: number;
  presentDays: number;
  lateDays: number;
  halfDays: number;
  absentDays: number;
  leaveDays: number;
  totalWorkMinutes: number;
  averageWorkMinutesPerDay: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const fmtTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null;

const fmtDuration = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const isWeekend = (dateStr: string) => {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay(); // 0 = Sun, 6 = Sat
  return day === 0 || day === 6;
};

// ─── Color & Status Configurations ──────────────────────────────────────────
const STATUS_STYLES: Record<string, {
  cellBg: string;
  cellBorder: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dot: string;
  label: string;
}> = {
  PRESENT: {
    cellBg: 'bg-emerald-50/70 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/50',
    cellBorder: 'border-emerald-200/70 dark:border-emerald-800/50',
    badgeBg: 'bg-emerald-100/80 dark:bg-emerald-900/60',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    badgeBorder: 'border-emerald-300/60 dark:border-emerald-700/60',
    dot: 'bg-emerald-500',
    label: 'Present'
  },
  LATE: {
    cellBg: 'bg-amber-50/70 dark:bg-amber-950/30 hover:bg-amber-100/70 dark:hover:bg-amber-950/50',
    cellBorder: 'border-amber-200/70 dark:border-amber-800/50',
    badgeBg: 'bg-amber-100/80 dark:bg-amber-900/60',
    badgeText: 'text-amber-800 dark:text-amber-300',
    badgeBorder: 'border-amber-300/60 dark:border-amber-700/60',
    dot: 'bg-amber-500',
    label: 'Late Arrival'
  },
  HALF_DAY: {
    cellBg: 'bg-indigo-50/70 dark:bg-indigo-950/30 hover:bg-indigo-100/70 dark:hover:bg-indigo-950/50',
    cellBorder: 'border-indigo-200/70 dark:border-indigo-800/50',
    badgeBg: 'bg-indigo-100/80 dark:bg-indigo-900/60',
    badgeText: 'text-indigo-800 dark:text-indigo-300',
    badgeBorder: 'border-indigo-300/60 dark:border-indigo-700/60',
    dot: 'bg-indigo-500',
    label: 'Half Day'
  },
  ABSENT: {
    cellBg: 'bg-rose-50/70 dark:bg-rose-950/30 hover:bg-rose-100/70 dark:hover:bg-rose-950/50',
    cellBorder: 'border-rose-200/70 dark:border-rose-800/50',
    badgeBg: 'bg-rose-100/80 dark:bg-rose-900/60',
    badgeText: 'text-rose-800 dark:text-rose-300',
    badgeBorder: 'border-rose-300/60 dark:border-rose-700/60',
    dot: 'bg-rose-500',
    label: 'Absent / Missed Punch'
  },
  LEAVE: {
    cellBg: 'bg-purple-50/70 dark:bg-purple-950/30 hover:bg-purple-100/70 dark:hover:bg-purple-950/50',
    cellBorder: 'border-purple-200/70 dark:border-purple-800/50',
    badgeBg: 'bg-purple-100/80 dark:bg-purple-900/60',
    badgeText: 'text-purple-800 dark:text-purple-300',
    badgeBorder: 'border-purple-300/60 dark:border-purple-700/60',
    dot: 'bg-purple-500',
    label: 'Approved Leave'
  },
  HOLIDAY: {
    cellBg: 'bg-cyan-50/70 dark:bg-cyan-950/30 hover:bg-cyan-100/70 dark:hover:bg-cyan-950/50',
    cellBorder: 'border-cyan-200/70 dark:border-cyan-800/50',
    badgeBg: 'bg-cyan-100/80 dark:bg-cyan-900/60',
    badgeText: 'text-cyan-800 dark:text-cyan-300',
    badgeBorder: 'border-cyan-300/60 dark:border-cyan-700/60',
    dot: 'bg-cyan-500',
    label: 'Holiday'
  },
  WEEKEND: {
    cellBg: 'bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100/60 dark:hover:bg-slate-800/40',
    cellBorder: 'border-slate-200/50 dark:border-slate-800/40',
    badgeBg: 'bg-slate-100/80 dark:bg-slate-800/80',
    badgeText: 'text-slate-500 dark:text-slate-400',
    badgeBorder: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
    label: 'Weekly Off'
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const AttendanceView: React.FC = () => {
  const { addToast, socket } = useSocket();
  const { user } = useAuth();

  const [timesheets, setTimesheets] = useState<TimesheetRecord[]>([]);
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [regularizations, setRegularizations] = useState<any[]>([]);
  const [summary, setSummary] = useState<MonthSummary | null>(null);

  const [viewMode, setViewMode] = useState<'CALENDAR' | 'LOG' | 'REGULARIZATION'>('CALENDAR');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Selected Day & Inspector Drawer State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // One-Click Regularization Modal Trigger
  const [isRegModalOpen, setIsRegModalOpen] = useState(false);
  const [regPreFillDate, setRegPreFillDate] = useState<string>('');

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth()); // 0-indexed

  const isManagerOrAdmin = ['MANAGER', 'ADMIN', 'HR_ADMIN'].includes(user?.role || '');

  // ── fetch Monthly Timesheet & Attendance Data ──────────────────────────────
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const [timeRes, regRes] = await Promise.all([
        api.get(`/attendance/my-timesheet?month=${calMonth + 1}&year=${calYear}`),
        api.get('/attendance/regularize/pending').catch(() => ({ data: { success: false, data: [] } }))
      ]);

      if (timeRes.data.success) {
        if (Array.isArray(timeRes.data.data)) {
          setTimesheets(timeRes.data.data);
          setHolidays([]);
          setLeaves([]);
          setSummary(null);
        } else {
          setTimesheets(timeRes.data.data.attendances || []);
          setHolidays(timeRes.data.data.holidays || []);
          setLeaves(timeRes.data.data.leaves || []);
          setSummary(timeRes.data.data.summary || null);
        }
      }

      if (regRes.data?.success) {
        setRegularizations(regRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load monthly attendance:', err);
      addToast('Error', 'Failed to fetch attendance data.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [calMonth, calYear]);

  useEffect(() => {
    if (!socket) return;
    socket.on('attendance:live_update', fetchAttendance);
    return () => {
      socket.off('attendance:live_update', fetchAttendance);
    };
  }, [socket, calMonth, calYear]);

  // ── regularize action (Manager / Admin) ────────────────────────────────────
  const handleRegularizeAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setActionLoadingId(id);
      const res = await api.patch(`/attendance/regularize/${id}/status`, { status });
      if (res.data.success) {
        addToast(
          status === 'APPROVED' ? 'Regularization Approved' : 'Regularization Rejected',
          `Request marked as ${status.toLowerCase()}.`,
          status === 'APPROVED' ? 'success' : 'info'
        );
        fetchAttendance();
      }
    } catch (err: any) {
      addToast('Action Failed', err.response?.data?.message || 'Could not process regularization.', 'danger');
    } finally {
      setActionLoadingId(null);
    }
  };

  // ── CSV export ─────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (timesheets.length === 0) {
      addToast('Export Warning', 'No timesheet rows available to export.', 'warning');
      return;
    }
    const headers = ['Date', 'Clock In', 'Clock Out', 'Work Duration', 'Break Minutes', 'Work Mode', 'Status', 'Regularized'];
    const rows = timesheets.map(t => [
      t.attendanceDate,
      fmtTime(t.clockInTime) ?? 'N/A',
      t.clockOutTime ? (fmtTime(t.clockOutTime) ?? '') : 'Active',
      t.totalWorkMinutes ? fmtDuration(t.totalWorkMinutes) : '—',
      t.totalBreakMinutes ?? 0,
      t.workMode || 'OFFICE',
      t.status,
      t.isRegularized ? 'Yes' : 'No'
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `Lexvera_Attendance_${calYear}-${String(calMonth + 1).padStart(2, '0')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Export Generated', 'Monthly attendance CSV has been downloaded.', 'success');
  };

  // ── Map lookups ────────────────────────────────────────────────────
  const recordMap = Object.fromEntries(timesheets.map(t => [t.attendanceDate, t]));
  const holidayMap = Object.fromEntries(holidays.map(h => [h.date, h]));
  
  // Map date to matching leave
  const getLeaveForDate = (dateStr: string) => {
    return leaves.find(l => dateStr >= l.fromDate && dateStr <= l.toDate);
  };

  // Calendar calculations (Monday start: 0 = Mon, 6 = Sun)
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const rawFirstDay = new Date(calYear, calMonth, 1).getDay(); // 0 = Sun, 1 = Mon ...
  const mondayOffset = (rawFirstDay + 6) % 7; // Mon = 0, Tue = 1, ... Sun = 6

  const todayStr = now.toISOString().slice(0, 10);

  const prevMonth = () => {
    if (calMonth === 0) {
      setCalYear(y => y - 1);
      setCalMonth(11);
    } else {
      setCalMonth(m => m - 1);
    }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (calMonth === 11) {
      setCalYear(y => y + 1);
      setCalMonth(0);
    } else {
      setCalMonth(m => m + 1);
    }
    setSelectedDate(null);
  };

  const jumpToToday = () => {
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
    setSelectedDate(todayStr);
  };

  // Monthly KPI fallback
  const presentCount = summary?.presentDays ?? timesheets.filter(t => t.status === 'PRESENT').length;
  const lateCount = summary?.lateDays ?? timesheets.filter(t => t.status === 'LATE').length;
  const halfDayCount = summary?.halfDays ?? timesheets.filter(t => t.status === 'HALF_DAY').length;
  const absentCount = summary?.absentDays ?? timesheets.filter(t => t.status === 'ABSENT').length;
  const leaveCount = summary?.leaveDays ?? leaves.length;
  const totalMins = summary?.totalWorkMinutes ?? timesheets.reduce((acc, t) => acc + (t.totalWorkMinutes || 0), 0);
  const avgMins = summary?.averageWorkMinutesPerDay ?? (
    (presentCount + lateCount + halfDayCount) > 0
      ? Math.round(totalMins / (presentCount + lateCount + halfDayCount))
      : 0
  );

  const selectedRecord = selectedDate ? recordMap[selectedDate] : null;
  const selectedHoliday = selectedDate ? holidayMap[selectedDate] : null;
  const selectedLeave = selectedDate ? getLeaveForDate(selectedDate) : null;
  const selectedIsWeekend = selectedDate ? isWeekend(selectedDate) : false;

  const filteredTimesheets = timesheets.filter(t => statusFilter === 'ALL' || t.status === statusFilter);

  // Pagination states (10, 25, 50, 100)
  const [punchLogPage, setPunchLogPage] = useState(1);
  const [punchLogPageSize, setPunchLogPageSize] = useState(10);
  const [regPage, setRegPage] = useState(1);
  const [regPageSize, setRegPageSize] = useState(10);

  useEffect(() => {
    setPunchLogPage(1);
  }, [statusFilter, viewMode, calYear, calMonth]);

  useEffect(() => {
    setRegPage(1);
  }, [viewMode]);

  const paginatedTimesheets = filteredTimesheets.slice(
    (punchLogPage - 1) * punchLogPageSize,
    punchLogPage * punchLogPageSize
  );

  const paginatedRegularizations = regularizations.slice(
    (regPage - 1) * regPageSize,
    regPage * regPageSize
  );

  // Trigger one-click regularization for selected date
  const handleTriggerRegularize = (dateStr: string) => {
    setRegPreFillDate(dateStr);
    setIsRegModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>Attendance & Timesheets</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
              Live Monitor
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Interactive monthly calendar grid, automated shift compliance, and deep day-level punch inspector.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── View Navigation Tabs ── */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl w-fit">
        {(['CALENDAR', 'LOG', 'REGULARIZATION'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setViewMode(tab)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
              viewMode === tab
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            {tab === 'CALENDAR' && <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />}
            {tab === 'CALENDAR'
              ? 'Monthly Calendar'
              : tab === 'LOG'
              ? `Punch Logs (${timesheets.length})`
              : `Regularizations (${regularizations.length})`}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 1. MONTHLY CALENDAR VIEW                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'CALENDAR' && (
        <div className="space-y-6">

          {/* ── Monthly KPI Strip ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Present Days', value: presentCount, style: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-200/60 dark:border-emerald-900/50' },
              { label: 'Late Arrival', value: lateCount, style: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-200/60 dark:border-amber-900/50' },
              { label: 'Half-Day', value: halfDayCount, style: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200/60 dark:border-indigo-900/50' },
              { label: 'Absent / Missing', value: absentCount, style: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-200/60 dark:border-rose-900/50' },
              { label: 'Approved Leaves', value: leaveCount, style: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50/70 dark:bg-purple-950/40 border-purple-200/60 dark:border-purple-900/50' },
              { label: 'Total Hours', value: fmtDuration(totalMins), style: 'text-slate-800 dark:text-slate-200', bg: 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' },
              { label: 'Daily Average', value: fmtDuration(avgMins), style: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200/40 dark:border-indigo-900/40' },
            ].map(item => (
              <div
                key={item.label}
                className={`${item.bg} border rounded-2xl p-3 shadow-2xs flex flex-col justify-between transition hover:shadow-xs`}
              >
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {item.label}
                </span>
                <span className={`text-xl font-black font-mono-num mt-1.5 ${item.style}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* ── Main Layout: Calendar Grid + Day Detail Inspector ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left 8 cols: Calendar Grid Matrix */}
            <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">

              {/* Month / Year Navigator Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
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
                    onClick={nextMonth}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={jumpToToday}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Today</span>
                  </button>
                </div>
              </div>

              {/* Weekday Header Strip */}
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
                  Loading attendance records...
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-2">
                  {/* Empty Offset Cells */}
                  {Array.from({ length: mondayOffset }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="min-h-[85px] sm:min-h-[96px] rounded-2xl bg-slate-50/30 dark:bg-slate-800/10 border border-dashed border-slate-100 dark:border-slate-800/50"
                    />
                  ))}

                  {/* Days */}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const dayNum = i + 1;
                    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const record = recordMap[dateStr];
                    const holiday = holidayMap[dateStr];
                    const leave = getLeaveForDate(dateStr);
                    const isSatSun = isWeekend(dateStr);
                    const isToday = dateStr === todayStr;
                    const isFuture = dateStr > todayStr;
                    const isSelected = selectedDate === dateStr;

                    // Compute display style & status label
                    let styleConfig = STATUS_STYLES.WEEKEND;
                    let displayLabel = '';
                    let subLabel = '';

                    if (holiday) {
                      styleConfig = STATUS_STYLES.HOLIDAY;
                      displayLabel = holiday.name;
                    } else if (leave) {
                      styleConfig = STATUS_STYLES.LEAVE;
                      displayLabel = leave.leaveType?.name || 'Approved Leave';
                    } else if (record) {
                      styleConfig = STATUS_STYLES[record.status] || STATUS_STYLES.PRESENT;
                      if (record.status === 'PRESENT') {
                        displayLabel = fmtDuration(record.totalWorkMinutes || 0);
                        subLabel = 'Present';
                      } else if (record.status === 'LATE') {
                        displayLabel = record.clockInTime ? fmtTime(record.clockInTime)! : 'Late';
                        subLabel = fmtDuration(record.totalWorkMinutes || 0);
                      } else if (record.status === 'HALF_DAY') {
                        displayLabel = fmtDuration(record.totalWorkMinutes || 0);
                        subLabel = 'Half-Day';
                      } else {
                        displayLabel = 'Absent';
                      }
                    } else if (isSatSun) {
                      styleConfig = STATUS_STYLES.WEEKEND;
                      displayLabel = 'Weekly Off';
                    } else if (!isFuture) {
                      // Past working day with no punch record
                      styleConfig = STATUS_STYLES.ABSENT;
                      displayLabel = 'Absent';
                      subLabel = 'Missed';
                    }

                    return (
                      <div
                        key={dateStr}
                        onClick={() => {
                          if (!isFuture || holiday || isSatSun) {
                            setSelectedDate(isSelected ? null : dateStr);
                          }
                        }}
                        className={`
                          min-h-[85px] sm:min-h-[96px] p-2 rounded-2xl border transition-all flex flex-col justify-between select-none
                          ${isFuture ? 'opacity-35 cursor-not-allowed bg-slate-50/40 dark:bg-slate-800/20 border-slate-200/50 dark:border-slate-800' : 'cursor-pointer hover:shadow-md hover:-translate-y-0.5'}
                          ${isSelected ? 'ring-2 ring-indigo-500 shadow-md shadow-indigo-500/20 scale-[1.02]' : ''}
                          ${!isSelected ? `${styleConfig.cellBg} ${styleConfig.cellBorder}` : 'bg-white dark:bg-slate-900 border-indigo-500'}
                          ${isToday && !isSelected ? 'ring-2 ring-indigo-400 dark:ring-indigo-500' : ''}
                        `}
                      >
                        {/* Top: Day Number & Today indicator */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold leading-none ${
                              isToday
                                ? 'px-1.5 py-0.5 rounded-md bg-indigo-600 text-white font-mono-num'
                                : isSatSun
                                ? 'text-rose-500 dark:text-rose-400 font-mono-num'
                                : 'text-slate-800 dark:text-slate-200 font-mono-num'
                            }`}
                          >
                            {dayNum}
                          </span>

                          {record?.isRegularized && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" title="Regularized" />
                          )}
                        </div>

                        {/* Bottom: In-Cell Status Pill / Logged Hours */}
                        <div className="mt-1">
                          {displayLabel && (
                            <div
                              className={`px-1.5 py-1 rounded-lg text-[10px] font-bold truncate flex flex-col items-start leading-tight border ${styleConfig.badgeBg} ${styleConfig.badgeText} ${styleConfig.badgeBorder}`}
                              title={`${displayLabel} ${subLabel}`}
                            >
                              <div className="flex items-center gap-1 w-full">
                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styleConfig.dot}`} />
                                <span className="truncate">{displayLabel}</span>
                              </div>
                              {subLabel && (
                                <span className="text-[9px] font-normal opacity-85 mt-0.5 truncate pl-2.5">
                                  {subLabel}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Status Legend Strip */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-3.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Present</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Late Arrival</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Half-Day</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Absent</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span>Approved Leave</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  <span>Holiday</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span>Weekly Off</span>
                </span>
              </div>
            </div>

            {/* Right 4 cols: Day Detail Inspector */}
            <div className="lg:col-span-4">
              {selectedDate ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5 animate-in fade-in slide-in-from-right-4 duration-200 sticky top-20">

                  {/* Header & Close */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Date Inspector
                      </span>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </h4>
                    </div>
                    <button
                      onClick={() => setSelectedDate(null)}
                      className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Badges: Status & Work Mode */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedHoliday && (
                      <span className="px-3 py-1 rounded-xl text-xs font-bold bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                        Holiday: {selectedHoliday.name}
                      </span>
                    )}
                    {selectedLeave && (
                      <span className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        Leave: {selectedLeave.leaveType?.name}
                      </span>
                    )}
                    {selectedIsWeekend && !selectedHoliday && !selectedLeave && (
                      <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        Weekly Off
                      </span>
                    )}
                    {selectedRecord && (
                      <>
                        <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                          selectedRecord.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' :
                          selectedRecord.status === 'LATE' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                          selectedRecord.status === 'HALF_DAY' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800' :
                          'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                        }`}>
                          {selectedRecord.status}
                        </span>

                        <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5">
                          {selectedRecord.workMode === 'REMOTE' ? <Home className="w-3.5 h-3.5 text-purple-500" /> : <Building2 className="w-3.5 h-3.5 text-slate-500" />}
                          <span>{selectedRecord.workMode || 'Office'}</span>
                        </span>

                        {selectedRecord.isRegularized && (
                          <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            Regularized
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Punch Timings Station */}
                  {selectedRecord ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Clock-In</span>
                        </div>
                        <p className="text-base font-bold font-mono-num text-emerald-600 dark:text-emerald-400">
                          {fmtTime(selectedRecord.clockInTime) || '—'}
                        </p>
                        {selectedRecord.clockInIp && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate" title={selectedRecord.clockInIp}>
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <span>{selectedRecord.clockInIp}</span>
                          </p>
                        )}
                      </div>

                      <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Clock-Out</span>
                        </div>
                        <p className={`text-base font-bold font-mono-num ${selectedRecord.clockOutTime ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-500 animate-pulse'}`}>
                          {selectedRecord.clockOutTime ? fmtTime(selectedRecord.clockOutTime) : '● Active'}
                        </p>
                        {selectedRecord.clockOutIp && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate" title={selectedRecord.clockOutIp}>
                            <MapPin className="w-2.5 h-2.5 shrink-0" />
                            <span>{selectedRecord.clockOutIp}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ) : !selectedHoliday && !selectedIsWeekend && selectedDate <= todayStr ? (
                    <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>Missing Punch Detected</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        No clock-in was recorded for this official working day. You can raise a regularization request to submit missed punch timestamps.
                      </p>
                    </div>
                  ) : null}

                  {/* Net Work Duration vs Target Shift (9 Hours) */}
                  {selectedRecord && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-600 dark:text-slate-300">Shift Target Adherence</span>
                        <span className="font-bold font-mono-num text-slate-900 dark:text-white">
                          {fmtDuration(selectedRecord.totalWorkMinutes || 0)} / 9h Shift
                        </span>
                      </div>
                      {/* Visual Progress Bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            (selectedRecord.totalWorkMinutes || 0) >= 510 ? 'bg-emerald-500' :
                            (selectedRecord.totalWorkMinutes || 0) >= 240 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.round(((selectedRecord.totalWorkMinutes || 0) / 540) * 100))}%`
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{Math.round(((selectedRecord.totalWorkMinutes || 0) / 540) * 100)}% shift completed</span>
                        {selectedRecord.totalBreakMinutes ? (
                          <span>Break: {fmtDuration(selectedRecord.totalBreakMinutes)}</span>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {/* Itemized Break Ledger Breakdown */}
                  {selectedRecord?.breaks && selectedRecord.breaks.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Coffee className="w-3.5 h-3.5 text-amber-500" />
                        <span>Break Intervals Ledger ({selectedRecord.breaks.length})</span>
                      </h5>
                      <div className="space-y-1.5">
                        {selectedRecord.breaks.map((b, idx) => (
                          <div
                            key={b.id || idx}
                            className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              <span className="font-semibold text-slate-700 dark:text-slate-300">{b.breakType || 'Break'}</span>
                            </div>
                            <div className="font-mono-num text-[11px] text-slate-500 dark:text-slate-400">
                              <span>{fmtTime(b.startTime)} &rarr; {b.endTime ? fmtTime(b.endTime) : 'In Progress'}</span>
                              <span className="ml-2 font-bold text-amber-600 dark:text-amber-400">({b.durationMinutes}m)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* One-Click Regularization Trigger */}
                  {(!selectedRecord || selectedRecord.status === 'LATE' || selectedRecord.status === 'ABSENT' || selectedRecord.status === 'HALF_DAY') && !selectedHoliday && !selectedIsWeekend && selectedDate <= todayStr && (
                    <div className="pt-2">
                      <button
                        onClick={() => handleTriggerRegularize(selectedDate)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-sm shadow-indigo-500/30 transition"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Request Regularization for this Day</span>
                      </button>
                    </div>
                  )}

                </div>
              ) : (
                /* Empty Selection Placeholder */
                <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center space-y-3 flex flex-col items-center justify-center min-h-[360px]">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Select Any Date</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                      Click on any date in the calendar grid to inspect exact clock-in/out timestamps, break logs, and shift metrics.
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 2. PUNCH LOGS TABLE VIEW (ALTERNATE TAB)                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'LOG' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 shrink-0">Filter Status:</span>
              <div className="w-[140px]">
                <CustomSelect
                  value={statusFilter}
                  onChange={(val) => setStatusFilter(val)}
                  size="sm"
                  options={[
                    { value: 'ALL', label: 'All Records' },
                    { value: 'PRESENT', label: 'Present' },
                    { value: 'LATE', label: 'Late' },
                    { value: 'HALF_DAY', label: 'Half-Day' },
                    { value: 'ABSENT', label: 'Absent' },
                  ]}
                />
              </div>
            </div>
            <span className="text-xs text-slate-400">
              Showing {filteredTimesheets.length} of {timesheets.length} logs
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Clock-In</th>
                  <th className="py-3 px-3">Clock-Out</th>
                  <th className="py-3 px-3">Work Duration</th>
                  <th className="py-3 px-3">Break Time</th>
                  <th className="py-3 px-3">Work Mode</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTimesheets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                      No punch log records found for this period.
                    </td>
                  </tr>
                ) : (
                  paginatedTimesheets.map(record => (
                    <tr key={record.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200 font-mono-num">
                        {record.attendanceDate}
                      </td>
                      <td className="py-3 px-3 font-mono-num text-emerald-600 dark:text-emerald-400">
                        {fmtTime(record.clockInTime) || '—'}
                      </td>
                      <td className="py-3 px-3 font-mono-num">
                        {record.clockOutTime ? (
                          <span className="text-rose-600 dark:text-rose-400">{fmtTime(record.clockOutTime)}</span>
                        ) : (
                          <span className="text-indigo-500 font-bold animate-pulse">● Active</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-bold font-mono-num text-slate-900 dark:text-white">
                        {fmtDuration(record.totalWorkMinutes || 0)}
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono-num">
                        {record.totalBreakMinutes ? `${record.totalBreakMinutes}m` : '0m'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {record.workMode || 'OFFICE'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          record.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200' :
                          record.status === 'LATE' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200' :
                          record.status === 'HALF_DAY' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 border border-indigo-200' :
                          'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedDate(record.attendanceDate);
                            setViewMode('CALENDAR');
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg transition"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={punchLogPage}
            pageSize={punchLogPageSize}
            totalEntries={filteredTimesheets.length}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={setPunchLogPage}
            onPageSizeChange={(newSize) => {
              setPunchLogPageSize(newSize);
              setPunchLogPage(1);
            }}
          />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 3. REGULARIZATIONS TAB                                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {viewMode === 'REGULARIZATION' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pending Regularization Requests</h3>
              <p className="text-xs text-slate-500">Submissions from team members requiring punch adjustments.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Proposed Timings</th>
                  <th className="py-3 px-3">Reason</th>
                  <th className="py-3 px-3">Status</th>
                  {isManagerOrAdmin && <th className="py-3 px-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {regularizations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      No pending regularization requests.
                    </td>
                  </tr>
                ) : (
                  paginatedRegularizations.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {r.user?.firstName} {r.user?.lastName}
                        </div>
                        <div className="text-[10px] text-slate-400">{r.user?.email}</div>
                      </td>
                      <td className="py-3 px-3 font-mono-num font-semibold text-slate-700 dark:text-slate-300">
                        {r.attendanceDate}
                      </td>
                      <td className="py-3 px-3 font-mono-num text-indigo-600 dark:text-indigo-400">
                        {r.proposedClockIn} &rarr; {r.proposedClockOut}
                      </td>
                      <td className="py-3 px-3 max-w-xs truncate text-slate-600 dark:text-slate-300" title={r.reason}>
                        {r.reason}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                          {r.status}
                        </span>
                      </td>
                      {isManagerOrAdmin && (
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleRegularizeAction(r.id, 'APPROVED')}
                              disabled={actionLoadingId === r.id}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRegularizeAction(r.id, 'REJECTED')}
                              disabled={actionLoadingId === r.id}
                              className="px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <PaginationControls
            currentPage={regPage}
            pageSize={regPageSize}
            totalEntries={regularizations.length}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={setRegPage}
            onPageSizeChange={(newSize) => {
              setRegPageSize(newSize);
              setRegPage(1);
            }}
          />
        </div>
      )}

      {/* ── Regularization Modal (Pre-populated when opened from Day Inspector) ── */}
      <RegularizationModal
        isOpen={isRegModalOpen}
        onClose={() => setIsRegModalOpen(false)}
        onSuccess={() => {
          fetchAttendance();
          setIsRegModalOpen(false);
        }}
        defaultDate={regPreFillDate}
      />

    </div>
  );
};
