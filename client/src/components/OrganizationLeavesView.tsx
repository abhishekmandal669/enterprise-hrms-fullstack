import React, { useState, useEffect } from 'react';
import {
  Users,
  Palmtree,
  Clock,
  CheckCircle2,
  Calendar,
  Search,
  RefreshCw,
  Sliders,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Loader2,
  Sparkles,
  RotateCw,
  Award,
  AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { PaginationControls } from './PaginationControls';
import { CustomSelect } from './CustomSelect';

interface OrganizationLeavesViewProps {
  onNavigateToEmployee?: (id: string) => void;
}

export const OrganizationLeavesView: React.FC<OrganizationLeavesViewProps> = ({
  onNavigateToEmployee
}) => {
  const { addToast, socket } = useSocket();

  // Subtab within Organization Leave View
  const [subTab, setSubTab] = useState<'AWAY' | 'PENDING' | 'BALANCES' | 'AUTOMATIONS'>('AWAY');

  // Overview Data
  const [overview, setOverview] = useState<{
    kpis: {
      totalActiveEmployees: number;
      awayTodayCount: number;
      pendingApprovalsCount: number;
      approvedThisMonthCount: number;
    };
    onLeaveToday: any[];
    pendingApprovals: any[];
    upcomingLeaves: any[];
  } | null>(null);

  // Balance Matrix Data
  const [balanceData, setBalanceData] = useState<{
    year: number;
    leaveTypes: any[];
    employees: any[];
  } | null>(null);

  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Action Loading
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Balance Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTargetUser, setAdjustTargetUser] = useState<any | null>(null);
  const [adjustLeaveTypeId, setAdjustLeaveTypeId] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [adjustAmount, setAdjustAmount] = useState<number>(1);
  const [adjustRemarks, setAdjustRemarks] = useState<string>('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // Automation Triggers
  const [triggeringAccrual, setTriggeringAccrual] = useState(false);
  const [triggeringCarry, setTriggeringCarry] = useState(false);

  // Pagination for Balance Matrix
  const [balancePage, setBalancePage] = useState(1);
  const [balancePageSize, setBalancePageSize] = useState(10);

  // Pagination for Pending Approvals
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPageSize, setPendingPageSize] = useState(10);

  // Load Overview Data
  const fetchOverview = async () => {
    try {
      const res = await api.get('/leaves/organization-overview');
      if (res.data?.success) {
        setOverview(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load leave overview:', err);
    }
  };

  // Load Balance Matrix
  const fetchBalances = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedDept && selectedDept !== 'ALL') params.append('departmentId', selectedDept);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await api.get(`/leaves/employee-balances?${params.toString()}`);
      if (res.data?.success) {
        setBalanceData(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load employee leave balances:', err);
    }
  };

  // Load Departments
  const fetchDepartments = async () => {
    try {
      const res = await api.get('/departments');
      if (res.data?.success) {
        setDepartments(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([fetchOverview(), fetchBalances(), fetchDepartments()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    fetchBalances();
  }, [selectedDept, searchQuery]);

  // Real-time socket updates
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      fetchOverview();
      fetchBalances();
    };
    socket.on('leaves:new_request', handleUpdate);
    socket.on('leaves:status_update', handleUpdate);
    return () => {
      socket.off('leaves:new_request', handleUpdate);
      socket.off('leaves:status_update', handleUpdate);
    };
  }, [socket]);

  // Handle Approve Request
  const handleApprove = async (id: string) => {
    try {
      setActionLoadingId(id);
      const res = await api.patch(`/leaves/${id}/approve`);
      if (res.data?.success) {
        addToast('Leave Approved', 'Request has been approved successfully.', 'success');
        fetchOverview();
        fetchBalances();
      }
    } catch (err: any) {
      addToast('Approval Failed', err.response?.data?.message || 'Failed to approve request.', 'danger');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Reject Request
  const handleRejectSubmit = async () => {
    if (!rejectRequestId) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      addToast('Validation', 'Please provide a valid rejection reason (minimum 5 chars).', 'warning');
      return;
    }
    try {
      setActionLoadingId(rejectRequestId);
      const res = await api.patch(`/leaves/${rejectRequestId}/reject`, { reason: rejectReason.trim() });
      if (res.data?.success) {
        addToast('Leave Rejected', 'Request has been declined.', 'info');
        setRejectModalOpen(false);
        setRejectRequestId(null);
        setRejectReason('');
        fetchOverview();
        fetchBalances();
      }
    } catch (err: any) {
      addToast('Rejection Failed', err.response?.data?.message || 'Failed to reject request.', 'danger');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Balance Adjustment Modal
  const openAdjustModal = (emp: any) => {
    setAdjustTargetUser(emp);
    if (balanceData?.leaveTypes?.length) {
      setAdjustLeaveTypeId(balanceData.leaveTypes[0].id);
    }
    setAdjustType('CREDIT');
    setAdjustAmount(1);
    setAdjustRemarks('');
    setIsAdjustModalOpen(true);
  };

  // Submit Balance Adjustment
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetUser || !adjustLeaveTypeId) return;

    try {
      setAdjustSubmitting(true);
      const res = await api.post('/leaves/adjust-balance', {
        userId: adjustTargetUser.id,
        leaveTypeId: adjustLeaveTypeId,
        adjustmentType: adjustType,
        amount: Number(adjustAmount),
        remarks: adjustRemarks.trim()
      });

      if (res.data?.success) {
        addToast('Balance Adjusted', res.data.message || 'Leave quota updated successfully.', 'success');
        setIsAdjustModalOpen(false);
        setAdjustTargetUser(null);
        fetchBalances();
      }
    } catch (err: any) {
      addToast('Adjustment Error', err.response?.data?.message || 'Failed to adjust balance.', 'danger');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  // Trigger Monthly Accrual
  const handleTriggerAccrual = async () => {
    try {
      setTriggeringAccrual(true);
      const res = await api.post('/leaves/admin/trigger-accrual');
      if (res.data?.success) {
        addToast('Accrual Processed', res.data.message, 'success');
        fetchBalances();
      }
    } catch (err: any) {
      addToast('Accrual Error', err.response?.data?.message || 'Accrual job failed.', 'danger');
    } finally {
      setTriggeringAccrual(false);
    }
  };

  // Trigger Carry Forward
  const handleTriggerCarry = async () => {
    try {
      setTriggeringCarry(true);
      const res = await api.post('/leaves/admin/trigger-carry-forward');
      if (res.data?.success) {
        addToast('Carry-Forward Processed', res.data.message, 'success');
        fetchBalances();
      }
    } catch (err: any) {
      addToast('Carry-Forward Error', err.response?.data?.message || 'Carry-forward job failed.', 'danger');
    } finally {
      setTriggeringCarry(false);
    }
  };

  const employees = balanceData?.employees || [];
  const paginatedEmployees = employees.slice(
    (balancePage - 1) * balancePageSize,
    balancePage * balancePageSize
  );

  const pendingList = overview?.pendingApprovals || [];
  const paginatedPending = pendingList.slice(
    (pendingPage - 1) * pendingPageSize,
    pendingPage * pendingPageSize
  );

  return (
    <div className="space-y-6">
      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Away Today
            </span>
            <Palmtree className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {overview?.kpis?.awayTodayCount ?? 0}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Staff on approved leave today
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Pending Approvals
            </span>
            <Clock className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {overview?.kpis?.pendingApprovalsCount ?? 0}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Awaiting manager or HR sign-off
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Approved (This Month)
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {overview?.kpis?.approvedThisMonthCount ?? 0}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Total approved time-off requests
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-500/10 border border-slate-500/20 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
              Total Active Staff
            </span>
            <Users className="w-5 h-5 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
            {overview?.kpis?.totalActiveEmployees ?? 0}
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            In company headcount
          </p>
        </div>
      </div>

      {/* ── Sub Navigation Tabs ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="w-full sm:w-auto max-w-full overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 w-max">
            <button
              onClick={() => setSubTab('AWAY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
                subTab === 'AWAY'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Palmtree className="w-3.5 h-3.5" />
              <span>Who's Away & Upcoming</span>
              {overview?.onLeaveToday?.length ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                  {overview.onLeaveToday.length}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setSubTab('PENDING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
                subTab === 'PENDING'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Approvals Queue</span>
              {overview?.kpis?.pendingApprovalsCount ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-700 dark:text-rose-300 font-bold">
                  {overview.kpis.pendingApprovalsCount}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setSubTab('BALANCES')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
                subTab === 'BALANCES'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Staff Balance Matrix</span>
            </button>

            <button
              onClick={() => setSubTab('AUTOMATIONS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
                subTab === 'AUTOMATIONS'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Leave Policies & Accruals</span>
            </button>
          </div>
        </div>

        <button
          onClick={loadAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 1. WHO'S AWAY & UPCOMING                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'AWAY' && (
        <div className="space-y-6">
          {/* Away Today Section */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Employees On Leave Today</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Currently active approved leaves across all teams
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : overview?.onLeaveToday?.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                🎉 Full attendance today! No employees are currently marked on leave.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {overview?.onLeaveToday.map(leave => (
                  <div
                    key={leave.id}
                    className="p-3.5 rounded-xl border border-amber-200/60 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 flex items-start gap-3 transition hover:shadow-xs"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-sm shrink-0">
                      {leave.user?.avatarUrl ? (
                        <img
                          src={leave.user.avatarUrl}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        `${leave.user?.firstName?.[0] || ''}${leave.user?.lastName?.[0] || ''}`
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p
                          className="text-xs font-bold text-slate-900 dark:text-white truncate cursor-pointer hover:text-indigo-600"
                          onClick={() => onNavigateToEmployee?.(leave.user.id)}
                        >
                          {leave.user.firstName} {leave.user.lastName}
                        </p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                          {leave.leaveType?.code || 'LEAVE'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {leave.user.department?.name || 'General'} • {leave.user.designation}
                      </p>
                      <div className="mt-2 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                        <span>{leave.fromDate} → {leave.toDate}</span>
                        <span className="font-semibold">{leave.durationDays}d</span>
                      </div>
                      {leave.reason && (
                        <p className="mt-1 text-[11px] italic text-slate-400 dark:text-slate-500 line-clamp-1">
                          "{leave.reason}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Leaves in Next 14 Days */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>Upcoming Leaves (Next 14 Days)</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Plan ahead for coverage and department operations
                </p>
              </div>
            </div>

            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : overview?.upcomingLeaves?.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                No upcoming leaves scheduled in the next 14 days.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <th className="py-2.5 px-3">Employee</th>
                      <th className="py-2.5 px-3">Department</th>
                      <th className="py-2.5 px-3">Leave Type</th>
                      <th className="py-2.5 px-3">Dates</th>
                      <th className="py-2.5 px-3 text-right">Duration</th>
                      <th className="py-2.5 px-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {overview?.upcomingLeaves.map(leave => (
                      <tr key={leave.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => onNavigateToEmployee?.(leave.user.id)}
                          >
                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs">
                              {leave.user?.firstName?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {leave.user.firstName} {leave.user.lastName}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">{leave.user.employeeCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          {leave.user.department?.name || '—'}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            {leave.leaveType?.name || leave.leaveType?.code}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {leave.fromDate} → {leave.toDate}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                          {leave.durationDays} days
                        </td>
                        <td className="py-3 px-3 text-slate-500 max-w-[200px] truncate">
                          {leave.reason || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 2. PENDING APPROVALS QUEUE                                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'PENDING' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span>Company-Wide Pending Approvals</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review and approve leave requests across all departments with immediate balance debit
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800">
              {pendingList.length} Requests Pending
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : pendingList.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-slate-800 dark:text-slate-200">All caught up!</p>
              <p className="mt-0.5">No pending leave requests requiring administrative review.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3">Applicant</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Dates</th>
                    <th className="py-2.5 px-3 text-right">Days</th>
                    <th className="py-2.5 px-3">Reason</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedPending.map(req => (
                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-3">
                        <div
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => onNavigateToEmployee?.(req.user.id)}
                        >
                          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                            {req.user?.firstName?.[0]}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">
                              {req.user.firstName} {req.user.lastName}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">{req.user.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        {req.user.department?.name || '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {req.leaveType?.name || req.leaveType?.code}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {req.fromDate} → {req.toDate}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-white">
                        {req.durationDays}d
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                        {req.reason}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={actionLoadingId === req.id}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50"
                          >
                            {actionLoadingId === req.id ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => {
                              setRejectRequestId(req.id);
                              setRejectReason('');
                              setRejectModalOpen(true);
                            }}
                            disabled={actionLoadingId === req.id}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400 hover:bg-rose-100 transition border border-rose-200 dark:border-rose-900"
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <PaginationControls
                  currentPage={pendingPage}
                  pageSize={pendingPageSize}
                  totalEntries={pendingList.length}
                  onPageChange={setPendingPage}
                  onPageSizeChange={setPendingPageSize}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 3. STAFF LEAVE BALANCE MATRIX                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'BALANCES' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-500" />
                <span>Employee Leave Balance Matrix ({balanceData?.year || new Date().getFullYear()})</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review available leave quotas and adjust allocations directly
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search staff by name or code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div className="w-full sm:w-56">
              <CustomSelect
                options={[
                  { value: 'ALL', label: 'All Departments' },
                  ...departments.map(d => ({ value: d.id, label: d.name }))
                ]}
                value={selectedDept}
                onChange={setSelectedDept}
              />
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : employees.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
              No staff members found matching filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Department</th>
                    {balanceData?.leaveTypes?.map(type => (
                      <th key={type.id} className="py-2.5 px-3 text-center">
                        <div>
                          <span className="font-bold text-slate-700 dark:text-slate-200">{type.code}</span>
                          <span className="block text-[10px] text-slate-400 font-normal">Avail / Alloc</span>
                        </div>
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-right">Adjustment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paginatedEmployees.map(emp => {
                    const balanceMap = Object.fromEntries(
                      (emp.leaveBalances || []).map((b: any) => [b.leaveTypeId, b])
                    );

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3">
                          <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={() => onNavigateToEmployee?.(emp.id)}
                          >
                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs">
                              {emp.firstName?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {emp.firstName} {emp.lastName}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">{emp.employeeCode}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                          {emp.department?.name || '—'}
                        </td>

                        {balanceData?.leaveTypes?.map(type => {
                          const bal = balanceMap[type.id];
                          const total = bal ? bal.totalAllocated : type.annualQuota;
                          const used = bal ? bal.used : 0;
                          const pending = bal ? bal.pendingApproval : 0;
                          const avail = Math.max(0, total - (used + pending));

                          return (
                            <td key={type.id} className="py-3 px-3 text-center font-mono">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">{avail}</span>
                              <span className="text-slate-400 text-[10px] mx-1">/</span>
                              <span className="text-slate-500 text-[10px]">{total}</span>
                            </td>
                          );
                        })}

                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => openAdjustModal(emp)}
                            className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-400 hover:bg-indigo-100 rounded-lg transition border border-indigo-200 dark:border-indigo-800"
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <PaginationControls
                  currentPage={balancePage}
                  pageSize={balancePageSize}
                  totalEntries={employees.length}
                  onPageChange={setBalancePage}
                  onPageSizeChange={setBalancePageSize}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 4. LEAVE POLICIES & AUTOMATED JOBS                                     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {subTab === 'AUTOMATIONS' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Automated Accrual & Rollover Engine</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Scheduled cron jobs credit monthly quotas and roll forward eligible leaves at year-end. You can also trigger them manually on demand.
            </p>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                    <RotateCw className="w-4 h-4" />
                    <span>Monthly Leave Accrual</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                    Credits 1.5 Paid Leaves (PL) and 1 Casual Leave (CL) to each active employee's quota for the active month, and appends a ledger audit record.
                  </p>
                </div>
                <button
                  onClick={handleTriggerAccrual}
                  disabled={triggeringAccrual}
                  className="mt-4 px-3 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {triggeringAccrual && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Run Monthly Accrual Now</span>
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs">
                    <Award className="w-4 h-4" />
                    <span>Year-End Carry Forward</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                    Lapses unspent Casual Leaves and rolls up to 30 unused Paid Leaves into the upcoming year's balance, logging a comprehensive carry-forward history.
                  </p>
                </div>
                <button
                  onClick={handleTriggerCarry}
                  disabled={triggeringCarry}
                  className="mt-4 px-3 py-2 text-xs font-semibold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {triggeringCarry && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Run Year-End Carry Forward Now</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Balance Adjustment ── */}
      {isAdjustModalOpen && adjustTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-500" />
                <span>Adjust Leave Balance</span>
              </h3>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-400">Target Staff:</span>{' '}
                <span className="font-bold text-slate-900 dark:text-white">
                  {adjustTargetUser.firstName} {adjustTargetUser.lastName} ({adjustTargetUser.employeeCode})
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Leave Type
                </label>
                <select
                  value={adjustLeaveTypeId}
                  onChange={e => setAdjustLeaveTypeId(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500 font-medium"
                >
                  {balanceData?.leaveTypes?.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Adjustment Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('CREDIT')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      adjustType === 'CREDIT'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/40'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Credit (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('DEBIT')}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      adjustType === 'DEBIT'
                        ? 'bg-rose-500/10 text-rose-600 border-rose-500/40'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>Debit (-)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Days Amount
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={adjustAmount}
                  onChange={e => setAdjustAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Audit Remarks / Reason
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Compensatory credit for weekend deployment work..."
                  value={adjustRemarks}
                  onChange={e => setAdjustRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting || adjustAmount <= 0}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {adjustSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Balance Adjustment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Decline / Reject ── */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>Decline Leave Request</span>
            </h3>
            <p className="text-xs text-slate-500">
              Please enter an official reason for declining this request. This will be visible to the employee.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Critical release sprint scheduled during this window..."
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-hidden focus:border-rose-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
