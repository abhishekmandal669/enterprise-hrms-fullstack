import React, { useState, useEffect } from 'react';
import {
  Users,
  AlertCircle,
  Clock,
  Coffee,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Plus,
  Loader2,
  Check,
  X,
  Laptop
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';

interface OrganizationAttendanceViewProps {
  onNavigateToEmployee?: (id: string) => void;
}

export const OrganizationAttendanceView: React.FC<OrganizationAttendanceViewProps> = ({
  onNavigateToEmployee
}) => {
  const { addToast } = useSocket();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalActive: 0,
    presentCount: 0,
    lateCount: 0,
    onBreakCount: 0,
    onLeaveCount: 0,
    absentCount: 0,
    attendanceRate: 0
  });
  const [roster, setRoster] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Manual Punch Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    userId: '',
    date: todayStr,
    clockInTime: '09:00',
    clockOutTime: '18:00',
    status: 'PRESENT',
    workMode: 'OFFICE',
    remarks: ''
  });

  const fetchOrganizationAttendance = async (date: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('date', date);
      if (selectedDept !== 'ALL') params.append('departmentId', selectedDept);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await api.get(`/attendance/organization?${params.toString()}`);
      if (res.data.success) {
        setSummary(res.data.data.summary);
        setRoster(res.data.data.roster);
      }
    } catch (err: any) {
      console.error('Failed to load org attendance:', err);
      addToast('Error', err.response?.data?.message || 'Failed to load organization attendance.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const res = await api.get('/master/dropdowns');
      if (res.data.success && res.data.data.departments) {
        setDepartments(res.data.data.departments);
      }
    } catch (_) {}
  };

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    fetchOrganizationAttendance(selectedDate);
  }, [selectedDate, selectedDept, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrganizationAttendance(selectedDate);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Date Navigation Helpers
  const shiftDate = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === todayStr;

  const handleOpenManualModal = (emp?: any) => {
    setManualForm({
      userId: emp ? emp.id : (roster[0]?.id || ''),
      date: selectedDate,
      clockInTime: emp?.clockInTime ? new Date(emp.clockInTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '09:00',
      clockOutTime: emp?.clockOutTime ? new Date(emp.clockOutTime).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '18:00',
      status: emp?.status === 'ABSENT' || emp?.status === 'ON_LEAVE' ? 'PRESENT' : (emp?.status || 'PRESENT'),
      workMode: emp?.workMode || 'OFFICE',
      remarks: ''
    });
    setIsManualModalOpen(true);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.userId || !manualForm.date || !manualForm.clockInTime) {
      addToast('Validation', 'Please fill in employee, date, and clock in time.', 'warning');
      return;
    }

    try {
      setSubmittingManual(true);
      const res = await api.post('/attendance/admin/manual-punch', manualForm);
      if (res.data.success) {
        addToast('Attendance Updated', res.data.message, 'success');
        setIsManualModalOpen(false);
        fetchOrganizationAttendance(selectedDate);
      }
    } catch (err: any) {
      addToast('Override Failed', err.response?.data?.message || 'Failed to submit manual punch.', 'danger');
    } finally {
      setSubmittingManual(false);
    }
  };

  const fmtTime = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const fmtMins = (mins: number) => {
    if (!mins || mins <= 0) return '—';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Date Selector & Action Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Date Navigator */}
        <div className="flex items-center justify-between sm:justify-start gap-1.5 sm:gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => shiftDate(-1)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer shrink-0"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-2.5 sm:px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-transparent focus:outline-hidden cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => shiftDate(1)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer shrink-0"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday && (
            <button
              type="button"
              onClick={() => setSelectedDate(todayStr)}
              className="px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-lg border border-indigo-200 dark:border-indigo-800 transition cursor-pointer shrink-0"
            >
              Today
            </button>
          )}
        </div>

        {/* Right Manual Override Trigger */}
        <div className="w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleOpenManualModal()}
            className="w-full sm:w-auto justify-center px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Manual Attendance Override</span>
          </button>
        </div>

      </div>

      {/* 2. Top Executive KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 truncate block">Total Staff</span>
          <div className="flex items-center justify-between">
            <span className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono-num">{summary.totalActive}</span>
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 shrink-0" />
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 shadow-xs space-y-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 truncate block">Present Rate</span>
          <div className="flex items-baseline justify-between gap-1 flex-wrap">
            <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono-num">{summary.attendanceRate}%</span>
            <span className="text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 shrink-0">
              {summary.presentCount} in
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 shadow-xs space-y-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 truncate block">Late Arrivals</span>
          <div className="flex items-center justify-between">
            <span className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono-num">{summary.lateCount}</span>
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-900/40 shadow-xs space-y-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 truncate block">On Break</span>
          <div className="flex items-center justify-between">
            <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono-num">{summary.onBreakCount}</span>
            <Coffee className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 shrink-0" />
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 shadow-xs space-y-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 truncate block">On Leave</span>
          <div className="flex items-center justify-between">
            <span className="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono-num">{summary.onLeaveCount}</span>
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 shrink-0" />
          </div>
        </div>

        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 shadow-xs space-y-1 min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 truncate block">Absent</span>
          <div className="flex items-center justify-between">
            <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono-num">{summary.absentCount}</span>
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 shrink-0" />
          </div>
        </div>
      </div>

      {/* 3. Filters & Search */}
      <div className="p-3 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff, code, role, dept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 sm:py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:border-indigo-500 text-slate-900 dark:text-white"
          />
        </div>

        {/* Department & Status Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto min-w-0">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 sm:py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden shrink-0"
          >
            <option value="ALL">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 no-scrollbar min-w-0 w-full sm:w-auto">
            {['ALL', 'PRESENT', 'LATE', 'ON_BREAK', 'ON_LEAVE', 'ABSENT'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1.5 sm:py-1 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === st
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* 4. Master Attendance Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs w-full max-w-full">
        <div className="overflow-x-auto w-full max-w-full">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department & Manager</th>
                <th className="py-3 px-4">Clock In</th>
                <th className="py-3 px-4">Clock Out</th>
                <th className="py-3 px-4">Work / Break</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    Fetching organization attendance logs...
                  </td>
                </tr>
              ) : roster.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No employee attendance records found matching filters.
                  </td>
                </tr>
              ) : (
                roster.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 overflow-hidden flex items-center justify-center font-bold text-xs text-indigo-600 dark:text-indigo-300 shrink-0">
                          {row.avatarUrl ? (
                            <img src={row.avatarUrl.startsWith('/') ? `${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}${row.avatarUrl}` : row.avatarUrl} alt={row.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{row.firstName?.[0]}{row.lastName?.[0]}</span>
                          )}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => onNavigateToEmployee?.(row.id)}
                            className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 transition block text-left"
                          >
                            {row.name}
                          </button>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {row.employeeCode} &bull; {row.designation}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{row.department}</span>
                        <span className="text-[10px] text-slate-400">Mgr: {row.reportingManager}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{fmtTime(row.clockInTime)}</span>
                        {row.clockInTime && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            {row.workMode === 'REMOTE' ? <Laptop className="w-3 h-3 text-indigo-400" /> : <Building2 className="w-3 h-3 text-slate-400" />}
                            <span>{row.workMode === 'REMOTE' ? 'Remote' : 'Office'}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {fmtTime(row.clockOutTime)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{fmtMins(row.totalWorkMinutes)}</span>
                        {row.totalBreakMinutes > 0 && (
                          <span className="text-[10px] text-slate-400">Break: {row.totalBreakMinutes}m</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {row.status === 'PRESENT' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          PRESENT
                        </span>
                      )}
                      {row.status === 'CLOCKED_OUT' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          CLOCKED OUT
                        </span>
                      )}
                      {row.status === 'LATE' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          LATE
                        </span>
                      )}
                      {row.status === 'ON_BREAK' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          ON BREAK
                        </span>
                      )}
                      {row.status === 'ON_LEAVE' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800" title={row.leaveDetails || ''}>
                          ON LEAVE
                        </span>
                      )}
                      {row.status === 'ABSENT' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          ABSENT
                        </span>
                      )}
                      {row.isRegularized && (
                        <span className="ml-1 text-[10px] text-amber-500 font-bold" title={row.regularizationRemarks || ''}>
                          *Overridden
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenManualModal(row)}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 rounded-md transition cursor-pointer"
                        title="Override Attendance"
                      >
                        Override
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Manual Attendance Override Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-500" />
                <span>Manual Attendance Override</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Employee
                </label>
                <select
                  value={manualForm.userId}
                  onChange={(e) => setManualForm({ ...manualForm, userId: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden"
                  required
                >
                  {roster.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.employeeCode}) - {r.department}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={manualForm.date}
                    onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Status
                  </label>
                  <select
                    value={manualForm.status}
                    onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden"
                  >
                    <option value="PRESENT">Present</option>
                    <option value="LATE">Late</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="ABSENT">Absent</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Clock In Time
                  </label>
                  <input
                    type="time"
                    value={manualForm.clockInTime}
                    onChange={(e) => setManualForm({ ...manualForm, clockInTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Clock Out Time
                  </label>
                  <input
                    type="time"
                    value={manualForm.clockOutTime}
                    onChange={(e) => setManualForm({ ...manualForm, clockOutTime: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Work Mode
                </label>
                <select
                  value={manualForm.workMode}
                  onChange={(e) => setManualForm({ ...manualForm, workMode: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden"
                >
                  <option value="OFFICE">Office HQ</option>
                  <option value="REMOTE">Remote / Work from Home</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Audit Remarks (Reason for Override)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Card scanner hardware fault / Approved by HR"
                  value={manualForm.remarks}
                  onChange={(e) => setManualForm({ ...manualForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingManual ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Override</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
