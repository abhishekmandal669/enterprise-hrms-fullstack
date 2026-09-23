import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { ApplyLeaveModal } from '../components/ApplyLeaveModal';
import { ConfirmModal } from '../components/ConfirmModal';
import { PaginationControls } from '../components/PaginationControls';
import { DelegationModal } from '../components/DelegationModal';
import { CustomSelect } from '../components/CustomSelect';
import { OrganizationLeavesView } from '../components/OrganizationLeavesView';
import {
  Check, X, Search, AlertCircle,
  Trash2, Plus, Download,
  Palmtree, BriefcaseMedical, Coffee, CalendarCheck2,
  Sparkles, History, RotateCw, Award, UserCheck, Building2
} from 'lucide-react';

export const LeavesView: React.FC = () => {
  const { user } = useAuth();
  const { addToast, socket } = useSocket();
  const navigate = useNavigate();

  const isAdminOrHR = ['ADMIN', 'HR_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');
  const [viewMode, setViewMode] = useState<'ORGANIZATION' | 'PERSONAL'>(
    isAdminOrHR ? 'ORGANIZATION' : 'PERSONAL'
  );

  const [requests, setRequests] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'MY' | 'PENDING_APPROVAL' | 'HISTORY'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [isTriggeringAccrual, setIsTriggeringAccrual] = useState(false);
  const [isTriggeringCarry, setIsTriggeringCarry] = useState(false);

  // Pagination State (10, 25, 50, 100)
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestsPageSize, setRequestsPageSize] = useState(10);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);

  // Apply Leave Modal State (Opens on button click)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isDelegationModalOpen, setIsDelegationModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedLeaveId, setSelectedLeaveId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');

  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'HR_ADMIN';

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      const [reqRes, balRes, histRes] = await Promise.all([
        api.get('/leaves/requests'),
        api.get('/leaves/balances'),
        api.get('/leaves/history')
      ]);

      if (reqRes.data.success) setRequests(reqRes.data.data);
      if (balRes.data.success) setBalances(balRes.data.data);
      if (histRes.data.success) setHistory(histRes.data.data);
    } catch (err) {
      console.error('Failed to load leave records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveData();
  }, [user?.role]);

  // Real-time updates via Socket
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchLeaveData();
    socket.on('leaves:new_request', handleUpdate);
    socket.on('leaves:status_update', handleUpdate);
    return () => {
      socket.off('leaves:new_request', handleUpdate);
      socket.off('leaves:status_update', handleUpdate);
    };
  }, [socket]);

  // Cancel Leave Confirmation State
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);

  // Handle Cancel / Delete Leave Request (Self)
  const handleDeleteLeave = (id: string) => {
    setCancelConfirmId(id);
  };

  const executeCancelLeave = async () => {
    if (!cancelConfirmId) return;
    try {
      setDeletingId(cancelConfirmId);
      const res = await api.delete(`/leaves/${cancelConfirmId}`);
      if (res.data.success) {
        addToast('Leave Cancelled', 'Leave request cancelled and quota balance restored.', 'success');
        setCancelConfirmId(null);
        fetchLeaveData();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to cancel leave request.', 'danger');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle Approve
  const handleApprove = async (id: string) => {
    try {
      const res = await api.patch(`/leaves/${id}/approve`);
      if (res.data.success) {
        addToast('Leave Approved', res.data.message || 'Leave request marked as Approved.', 'success');
        fetchLeaveData();
      }
    } catch (err: any) {
      addToast('Approval Failed', err.response?.data?.message || 'Error approving leave.', 'danger');
    }
  };

  // Open Reject Modal
  const openRejectModal = (id: string) => {
    setSelectedLeaveId(id);
    setRejectReason('');
    setRejectError('');
    setRejectModalOpen(true);
  };

  // Submit Rejection
  const handleSubmitReject = async () => {
    if (!rejectReason || rejectReason.trim().length < 10) {
      setRejectError('Rejection reason is mandatory and must be at least 10 characters.');
      return;
    }

    try {
      const res = await api.patch(`/leaves/${selectedLeaveId}/reject`, {
        reason: rejectReason.trim()
      });

      if (res.data.success) {
        addToast('Leave Declined', 'Leave request has been marked as declined.', 'warning');
        setRejectModalOpen(false);
        fetchLeaveData();
      }
    } catch (err: any) {
      setRejectError(err.response?.data?.message || 'Failed to decline leave.');
    }
  };

  // Client-Side CSV Export (RFC 4180 Compliant)
  const handleExportCSV = () => {
    if (requests.length === 0) {
      addToast('Export Warning', 'No leave records available to export.', 'warning');
      return;
    }

    const headers = ['Applicant', 'Email', 'Role', 'Leave Type', 'From Date', 'To Date', 'Days', 'Status', 'Reason', 'Applied At'];
    const rows = filteredRequests.map(r => [
      `"${r.user?.firstName || ''} ${r.user?.lastName || ''}"`,
      `"${r.user?.email || ''}"`,
      `"${r.user?.designation || r.user?.role || ''}"`,
      `"${r.leaveType?.name || r.leaveTypeCode || ''}"`,
      r.fromDate,
      r.toDate,
      r.durationDays || (r.isHalfDay ? 0.5 : 1),
      r.status,
      `"${(r.reason || '').replace(/"/g, '""')}"`,
      new Date(r.createdAt).toLocaleDateString()
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Nexus_Leaves_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('Export Generated', 'Leave ledger CSV exported successfully.', 'success');
  };

  // Extract Quotas
  const plBal = balances.find(b => b.leaveType?.code === 'PL');
  const clBal = balances.find(b => b.leaveType?.code === 'CL');
  const slBal = balances.find(b => b.leaveType?.code === 'SL');
  const compBal = balances.find(b => b.leaveType?.code === 'COMP_OFF');

  const plAvail = plBal ? Math.max(0, plBal.totalAllocated - plBal.used - plBal.pendingApproval) : 18;
  const clAvail = clBal ? Math.max(0, clBal.totalAllocated - clBal.used - clBal.pendingApproval) : 12;
  const slAvail = slBal ? Math.max(0, slBal.totalAllocated - slBal.used - slBal.pendingApproval) : 10;
  const compAvail = compBal ? Math.max(0, compBal.totalAllocated - compBal.used - compBal.pendingApproval) : 0;

  const totalAllocated = (plBal?.totalAllocated || 18) + (clBal?.totalAllocated || 12) + (slBal?.totalAllocated || 10) + (compBal?.totalAllocated || 0);
  const totalUsed = (plBal?.used || 0) + (clBal?.used || 0) + (slBal?.used || 0) + (compBal?.used || 0);
  const totalAvailable = plAvail + clAvail + slAvail + compAvail;

  // Filter requests
  const filteredRequests = requests.filter(req => {
    const applicantName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.toLowerCase();
    const reasonText = (req.reason || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = applicantName.includes(q) || reasonText.includes(q);

    const matchesType = typeFilter === 'ALL' || req.leaveType?.code === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;

    let matchesTab = true;
    if (activeTab === 'MY') {
      matchesTab = req.userId === user?.id;
    } else if (activeTab === 'PENDING_APPROVAL') {
      matchesTab = req.status === 'PENDING' && (isManagerOrAdmin ? req.userId !== user?.id : true);
    }

    return matchesSearch && matchesType && matchesStatus && matchesTab;
  });

  const pendingCount = requests.filter(r => r.status === 'PENDING' && (isManagerOrAdmin ? r.userId !== user?.id : true)).length;
  const myLeavesCount = requests.filter(r => r.userId === user?.id).length;

  const paginatedRequests = filteredRequests.slice(
    (requestsPage - 1) * requestsPageSize,
    requestsPage * requestsPageSize
  );

  const paginatedHistory = history.slice(
    (historyPage - 1) * historyPageSize,
    historyPage * historyPageSize
  );

  return (
    <div className="space-y-6">
      
      {/* 1. Header Bar: Title + Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Leave Management & Applications</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Enterprise Ledger
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Check live annual quotas, submit planned time-off, and track manager approvals
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {(user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') && (
            <>
              <button
                onClick={async () => {
                  try {
                    setIsTriggeringAccrual(true);
                    const res = await api.post('/leaves/admin/trigger-accrual');
                    addToast('Accrual Processed', res.data.message || 'Monthly leave credit executed.', 'success');
                    fetchLeaveData();
                  } catch (err: any) {
                    addToast('Accrual Failed', err.response?.data?.message || 'Failed to trigger accrual.', 'danger');
                  } finally {
                    setIsTriggeringAccrual(false);
                  }
                }}
                disabled={isTriggeringAccrual}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 rounded-xl transition disabled:opacity-50"
                title="Run monthly leave credit cron immediately"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isTriggeringAccrual ? 'Accruing...' : 'Run Monthly Accrual'}</span>
              </button>

              <button
                onClick={async () => {
                  try {
                    setIsTriggeringCarry(true);
                    const res = await api.post('/leaves/admin/trigger-carry-forward');
                    addToast('Carry Forward Done', res.data.message || 'Year-end carry forward executed.', 'success');
                    fetchLeaveData();
                  } catch (err: any) {
                    addToast('Carry Forward Failed', err.response?.data?.message || 'Failed to trigger carry forward.', 'danger');
                  } finally {
                    setIsTriggeringCarry(false);
                  }
                }}
                disabled={isTriggeringCarry}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 rounded-xl transition disabled:opacity-50"
                title="Run year-end carry forward cron immediately"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{isTriggeringCarry ? 'Processing...' : 'Run Carry Forward'}</span>
              </button>
            </>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {isManagerOrAdmin && (
            <button
              onClick={() => setIsDelegationModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 rounded-xl transition"
              title="Delegate Approval Authority to Colleague"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span>Delegate Approvals</span>
            </button>
          )}

          <button
            onClick={() => setIsApplyModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-md shadow-indigo-600/30 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Apply for Leave</span>
          </button>
        </div>
      </div>

      {/* ── View Switcher: Organization Command Center vs My Leaves (Scrollable on Mobile) ── */}
      {isAdminOrHR && (
        <div className="w-full max-w-full overflow-x-auto pb-1 no-scrollbar">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl w-max">
            <button
              onClick={() => setViewMode('ORGANIZATION')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
                viewMode === 'ORGANIZATION'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>Organization Leave Command Center</span>
            </button>
            <button
              onClick={() => setViewMode('PERSONAL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap shrink-0 ${
                viewMode === 'PERSONAL'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Palmtree className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>My Leaves & Applications</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Organization Command Center ── */}
      {viewMode === 'ORGANIZATION' && isAdminOrHR && (
        <OrganizationLeavesView onNavigateToEmployee={(id) => navigate('/employees/' + id)} />
      )}

      {/* ── Personal View ── */}
      {viewMode === 'PERSONAL' && (
        <>
          {/* 2. Quota Overview Cards (Top Metric Summary) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Paid Leave (PL) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-indigo-200 dark:hover:border-indigo-900/60 transition">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
              <Palmtree className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1">
              {plBal?.carriedForward > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                  +{plBal.carriedForward}d c/f
                </span>
              )}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Allocated: {plBal?.totalAllocated || 18}d
              </span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono-num">
              {plAvail} <span className="text-xs font-medium text-slate-400">Days</span>
            </span>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">
              Paid Leave (PL)
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono-num">
            <span>Used: <strong className="text-slate-700 dark:text-slate-300">{plBal?.used || 0}d</strong></span>
            <span>Pending: <strong className="text-amber-500">{plBal?.pendingApproval || 0}d</strong></span>
          </div>
        </div>

        {/* Casual Leave (CL) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-indigo-200 dark:hover:border-indigo-900/60 transition">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
              <Coffee className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Allocated: {clBal?.totalAllocated || 12}d
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono-num">
              {clAvail} <span className="text-xs font-medium text-slate-400">Days</span>
            </span>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">
              Casual Leave (CL)
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono-num">
            <span>Used: <strong className="text-slate-700 dark:text-slate-300">{clBal?.used || 0}d</strong></span>
            <span>Pending: <strong className="text-amber-500">{clBal?.pendingApproval || 0}d</strong></span>
          </div>
        </div>

        {/* Sick Leave (SL) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-indigo-200 dark:hover:border-indigo-900/60 transition">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center">
              <BriefcaseMedical className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
              Allocated: {slBal?.totalAllocated || 10}d
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono-num">
              {slAvail} <span className="text-xs font-medium text-slate-400">Days</span>
            </span>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">
              Sick Leave (SL)
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono-num">
            <span>Used: <strong className="text-slate-700 dark:text-slate-300">{slBal?.used || 0}d</strong></span>
            <span>Pending: <strong className="text-amber-500">{slBal?.pendingApproval || 0}d</strong></span>
          </div>
        </div>

        {/* Compensatory Off (COMP_OFF) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col justify-between hover:border-indigo-200 dark:hover:border-indigo-900/60 transition">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              Earned: {compBal?.totalAllocated || 0}d
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono-num">
              {compAvail} <span className="text-xs font-medium text-slate-400">Days</span>
            </span>
            <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">
              Compensatory Off (COMP_OFF)
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between font-mono-num">
            <span>Used: <strong className="text-slate-700 dark:text-slate-300">{compBal?.used || 0}d</strong></span>
            <span>Pending: <strong className="text-amber-500">{compBal?.pendingApproval || 0}d</strong></span>
          </div>
        </div>

        {/* Overall Quota Pool */}
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white rounded-2xl p-4 shadow-md flex flex-col justify-between border border-indigo-800/40">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-xl bg-white/10 text-indigo-300 flex items-center justify-center">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Active FY26
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white font-mono-num">
              {totalAvailable} <span className="text-xs font-medium text-indigo-300">/ {totalAllocated}d</span>
            </span>
            <div className="text-xs font-bold text-indigo-100 mt-0.5">
              Total Remaining Balance
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-white/10 text-[11px] text-indigo-200/80 flex items-center justify-between font-mono-num">
            <span>Used: {totalUsed}d</span>
            <span>{Math.round(((totalAllocated - totalAvailable) / (totalAllocated || 1)) * 100)}% Consumed</span>
          </div>
        </div>

      </div>

      {/* 3. Leave Requests & Ledger Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
        
        {/* Controls Bar: Tabs + Filters */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-lg transition ${activeTab === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
            >
              All Records ({requests.length})
            </button>
            <button
              onClick={() => setActiveTab('MY')}
              className={`px-3.5 py-1.5 rounded-lg transition ${activeTab === 'MY' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
            >
              My Leaves ({myLeavesCount})
            </button>
            {isManagerOrAdmin && (
              <button
                onClick={() => setActiveTab('PENDING_APPROVAL')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${activeTab === 'PENDING_APPROVAL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
              >
                <span>Pending Approvals</span>
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition ${activeTab === 'HISTORY' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'}`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Accrual & Ledger History ({history.length})</span>
            </button>
          </div>

          {/* Search & Multi-Filters */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search applicant or reason..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 w-44 sm:w-56"
              />
            </div>

            {/* Leave Type Dropdown */}
            <div className="w-[155px]">
              <CustomSelect
                value={typeFilter}
                onChange={(val) => setTypeFilter(val)}
                size="sm"
                options={[
                  { value: 'ALL', label: 'All Categories' },
                  { value: 'PL', label: 'Paid Leave (PL)' },
                  { value: 'CL', label: 'Casual Leave (CL)' },
                  { value: 'SL', label: 'Sick Leave (SL)' },
                ]}
              />
            </div>

            {/* Status Dropdown */}
            <div className="w-[140px]">
              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                size="sm"
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'APPROVED', label: 'Approved' },
                  { value: 'PENDING', label: 'Pending' },
                  { value: 'REJECTED', label: 'Declined' },
                ]}
              />
            </div>

          </div>
        </div>

        {/* Requests Ledger Table or Accrual History Table */}
        {activeTab === 'HISTORY' ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Transaction Type</th>
                  <th className="py-2.5 px-3">Leave Code</th>
                  <th className="py-2.5 px-3">Credit / Debit</th>
                  <th className="py-2.5 px-3">Balance Progression</th>
                  <th className="py-2.5 px-3">Remarks / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span>Loading accrual ledger...</span>
                      </div>
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No accrual or carry-forward transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  paginatedHistory.map((h: any) => {
                    const isCredit = h.amount > 0;
                    const getTxBadge = (type: string) => {
                      switch (type) {
                        case 'MONTHLY_ACCRUAL':
                          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Monthly Accrual</span>;
                        case 'YEAR_END_CARRY_FORWARD':
                          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400 border border-purple-200 dark:border-purple-800">Carry Forward</span>;
                        case 'LEAVE_DEBIT':
                          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-800">Leave Debit</span>;
                        case 'COMP_OFF_CREDIT':
                          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">Comp-Off Credit</span>;
                        default:
                          return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">Adjustment</span>;
                      }
                    };

                    return (
                      <tr key={h.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-3 whitespace-nowrap text-slate-500 font-mono-num text-[11px]">
                          {new Date(h.createdAt).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {getTxBadge(h.transactionType)}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-800 dark:text-slate-200">
                          {h.leaveType?.name || h.leaveType?.code || 'LEAVE'}
                        </td>
                        <td className="py-3 px-3 font-bold font-mono-num whitespace-nowrap">
                          <span className={isCredit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {isCredit ? `+${h.amount}` : h.amount} Days
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-mono-num text-[11px] whitespace-nowrap">
                          <span>{h.balanceBefore}d</span>
                          <span className="text-slate-400 mx-1.5">&rarr;</span>
                          <strong className="text-slate-900 dark:text-white">{h.balanceAfter}d</strong>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-sm truncate" title={h.remarks}>
                          {h.remarks || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Accrual Ledger History Pagination */}
            <PaginationControls
              currentPage={historyPage}
              pageSize={historyPageSize}
              totalEntries={history.length}
              onPageChange={setHistoryPage}
              onPageSizeChange={(newSize) => {
                setHistoryPageSize(newSize);
                setHistoryPage(1);
              }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Applicant</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Quota Impact</th>
                  <th className="py-2.5 px-3">Schedule</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span>Loading leave requests...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No leave records match the selected filter.
                    </td>
                  </tr>
                ) : (
                  paginatedRequests.map(l => {
                    const isMyPending = l.userId === user?.id && l.status === 'PENDING';
                    const canAction = isManagerOrAdmin && l.status === 'PENDING' && l.userId !== user?.id;

                    return (
                      <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        
                        {/* Applicant */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={l.user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(l.user?.firstName || 'U')}&background=6366f1&color=fff`}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                            />
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block leading-tight">
                                {l.user?.firstName} {l.user?.lastName}
                              </span>
                              <span className="text-[10px] text-slate-400 block">
                                {l.user?.designation || l.user?.role || 'Staff'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Leave Type */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {l.leaveType?.name || l.leaveTypeCode || 'Leave'}
                          </span>
                        </td>

                        {/* Quota Impact */}
                        <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          {l.durationDays} {l.durationDays === 1 ? 'Day' : 'Days'}
                          {l.isHalfDay && (
                            <span className="text-[10px] text-slate-400 block font-normal">
                              ({l.halfDaySlot === 'FIRST_HALF' ? 'First Half' : 'Second Half'})
                            </span>
                          )}
                        </td>

                        {/* Date Schedule */}
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap font-mono-num text-[11px]">
                          <span>{l.fromDate}</span>
                          <span className="text-slate-400 mx-1.5">&rarr;</span>
                          <span>{l.toDate}</span>
                        </td>

                        {/* Reason */}
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={l.reason}>
                          <span>{l.reason}</span>
                          {l.rejectionReason && (
                            <span className="text-rose-500 text-[10px] block mt-0.5 italic">
                              Decline Reason: {l.rejectionReason}
                            </span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            l.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800' :
                            l.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800' :
                            'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800 animate-pulse'
                          }`}>
                            {l.status === 'APPROVED' ? 'Approved' : l.status === 'REJECTED' ? 'Declined' : 'Pending Review'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* Manager / Admin Approve & Reject */}
                            {canAction && (
                              <>
                                <button
                                  onClick={() => handleApprove(l.id)}
                                  title="Approve Leave Request"
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:hover:bg-emerald-900 transition"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => openRejectModal(l.id)}
                                  title="Decline Leave Request"
                                  className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-400 dark:hover:bg-rose-900 transition"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}

                            {/* Applicant Self Delete/Cancel Pending */}
                            {isMyPending && (
                              <button
                                onClick={() => handleDeleteLeave(l.id)}
                                disabled={deletingId === l.id}
                                title="Cancel & Delete Pending Application"
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-[11px] font-semibold transition"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Cancel</span>
                              </button>
                            )}

                            {!canAction && !isMyPending && (
                              <span className="text-[10px] text-slate-400">—</span>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Leave Applications Pagination */}
            <PaginationControls
              currentPage={requestsPage}
              pageSize={requestsPageSize}
              totalEntries={filteredRequests.length}
              onPageChange={setRequestsPage}
              onPageSizeChange={(newSize) => {
                setRequestsPageSize(newSize);
                setRequestsPage(1);
              }}
            />
          </div>
        )}
      </div>
        </>
      )}

      {/* 4. Apply Leave Modal (Opens on "+ Apply for Leave" button click) */}
      <ApplyLeaveModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        onSuccess={fetchLeaveData}
      />

      {/* 5. Reject Modal */}
      {rejectModalOpen && createPortal(
        <div
          onClick={() => setRejectModalOpen(false)}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Decline Leave Request</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed">
              As per compliance policy, a rejection reason is mandatory (minimum 10 characters) and will be logged into the audit ledger.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Rejection Reason *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Critical project sprint milestone scheduled during these dates..."
                rows={3}
                className="w-full text-xs p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:ring-1 focus:ring-rose-500"
              />
              {rejectError && <p className="text-[11px] text-rose-500 font-semibold">{rejectError}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReject}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 6. Cancel Leave Confirmation Modal */}
      <ConfirmModal
        isOpen={!!cancelConfirmId}
        title="Cancel Leave Application"
        message="Are you sure you want to cancel this pending leave request? Any reserved quota will be restored to your leave balance immediately."
        confirmText="Yes, Cancel Leave"
        cancelText="Keep Request"
        variant="danger"
        isLoading={!!deletingId}
        onConfirm={executeCancelLeave}
        onCancel={() => setCancelConfirmId(null)}
      />

      {/* 7. Approval Delegation Modal */}
      <DelegationModal
        isOpen={isDelegationModalOpen}
        onClose={() => setIsDelegationModalOpen(false)}
        onDelegationChanged={fetchLeaveData}
      />

    </div>
  );
};
