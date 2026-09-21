import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Calendar,
  Clock,
  Loader2,
  Check,
  X
} from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { PaginationControls } from '../../components/PaginationControls';

export const ManagerApprovalCenter: React.FC = () => {
  const { addToast } = useSocket();
  const [activeTab, setActiveTab] = useState<'LEAVES' | 'REGULARIZATIONS'>('LEAVES');
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [regularizations, setRegularizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectItem, setRejectItem] = useState<{ id: string; type: 'LEAVE' | 'REGULARIZATION' } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Pagination States (10, 25, 50, 100)
  const [leavePage, setLeavePage] = useState(1);
  const [leavePageSize, setLeavePageSize] = useState(10);
  const [regPage, setRegPage] = useState(1);
  const [regPageSize, setRegPageSize] = useState(10);

  const paginatedLeaveRequests = leaveRequests.slice(
    (leavePage - 1) * leavePageSize,
    leavePage * leavePageSize
  );

  const paginatedRegularizations = regularizations.slice(
    (regPage - 1) * regPageSize,
    regPage * regPageSize
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const [leavesRes, regRes] = await Promise.allSettled([
        api.get('/leaves/requests'),
        api.get('/attendance/regularize/team')
      ]);

      if (leavesRes.status === 'fulfilled' && leavesRes.value.data?.success) {
        setLeaveRequests(leavesRes.value.data.data.filter((l: any) => l.status === 'PENDING'));
      }
      if (regRes.status === 'fulfilled' && regRes.value.data?.success) {
        setRegularizations(regRes.value.data.data.filter((r: any) => r.status === 'PENDING'));
      }
    } catch (err) {
      console.error('Failed to load approval items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApproveLeave = async (id: string) => {
    try {
      setActionId(id);
      const res = await api.patch(`/leaves/requests/${id}/status`, { status: 'APPROVED' });
      if (res.data.success) {
        addToast('Leave Approved', 'The leave request has been approved.', 'success');
        fetchData();
      }
    } catch (err: any) {
      addToast('Approval Failed', err.response?.data?.message || 'Could not approve leave.', 'danger');
    } finally {
      setActionId(null);
    }
  };

  const handleApproveRegularization = async (id: string) => {
    try {
      setActionId(id);
      const res = await api.patch(`/attendance/regularize/${id}/status`, { status: 'APPROVED' });
      if (res.data.success) {
        addToast('Punch Regularized', 'Missing punch request approved and attendance updated.', 'success');
        fetchData();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Could not approve regularization.', 'danger');
    } finally {
      setActionId(null);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectItem || !rejectReason.trim()) return;

    try {
      setActionId(rejectItem.id);
      if (rejectItem.type === 'LEAVE') {
        const res = await api.patch(`/leaves/requests/${rejectItem.id}/status`, {
          status: 'REJECTED',
          rejectionReason: rejectReason.trim()
        });
        if (res.data.success) {
          addToast('Leave Rejected', 'The leave request has been declined.', 'info');
        }
      } else {
        const res = await api.patch(`/attendance/regularize/${rejectItem.id}/status`, {
          status: 'REJECTED',
          rejectionReason: rejectReason.trim()
        });
        if (res.data.success) {
          addToast('Regularization Declined', 'Punch request declined.', 'info');
        }
      }
      setRejectModalOpen(false);
      setRejectItem(null);
      setRejectReason('');
      fetchData();
    } catch (err: any) {
      addToast('Action Failed', err.response?.data?.message || 'Failed to reject request.', 'danger');
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Manager Approval Center</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Team Oversight
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidated approval queue for employee leave requests, WFH applications, and attendance regularizations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
          <button
            onClick={() => setActiveTab('LEAVES')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'LEAVES'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Leave Requests ({leaveRequests.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('REGULARIZATIONS')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'REGULARIZATIONS'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Attendance Regularizations ({regularizations.length})</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
          <span>Loading approval queue...</span>
        </div>
      ) : activeTab === 'LEAVES' ? (
        <div className="space-y-4">
          {leaveRequests.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
              <p className="font-bold text-slate-700 dark:text-slate-300">Approval queue is all clear!</p>
              <p className="mt-0.5">No pending employee leave requests requiring your review.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {paginatedLeaveRequests.map(req => (
                  <div
                    key={req.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          Pending Approval
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {req.leaveType?.name || 'Leave'}
                        </span>
                      </div>

                      <div>
                        <strong className="text-sm font-bold text-slate-900 dark:text-white block">
                          {req.user?.firstName} {req.user?.lastName}
                        </strong>
                        <span className="text-xs text-slate-400">
                          {req.user?.designation} &bull; {req.user?.department?.name || 'Department'}
                        </span>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-300">
                        <strong>Reason: </strong> {req.reason}
                      </div>

                      <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                        <span>Duration: <strong className="text-slate-800 dark:text-slate-200">{req.durationDays} day(s)</strong></span>
                        <span>From: <strong className="text-slate-800 dark:text-slate-200">{req.fromDate}</strong></span>
                        <span>To: <strong className="text-slate-800 dark:text-slate-200">{req.toDate}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveLeave(req.id)}
                        disabled={actionId === req.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => {
                          setRejectItem({ id: req.id, type: 'LEAVE' });
                          setRejectModalOpen(true);
                        }}
                        disabled={actionId === req.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
                <PaginationControls
                  currentPage={leavePage}
                  pageSize={leavePageSize}
                  totalEntries={leaveRequests.length}
                  pageSizeOptions={[10, 25, 50, 100]}
                  onPageChange={setLeavePage}
                  onPageSizeChange={(newSize) => {
                    setLeavePageSize(newSize);
                    setLeavePage(1);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {regularizations.length === 0 ? (
            <div className="p-16 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2" />
              <p className="font-bold text-slate-700 dark:text-slate-300">No punch regularizations pending!</p>
              <p className="mt-0.5">All team punch correction requests have been resolved.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {paginatedRegularizations.map(r => (
                  <div
                    key={r.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          Missing Punch Regularization
                        </span>
                        <span className="font-mono-num text-xs font-bold text-slate-500">
                          Date: {r.attendanceDate}
                        </span>
                      </div>

                      <div>
                        <strong className="text-sm font-bold text-slate-900 dark:text-white block">
                          {r.user?.firstName} {r.user?.lastName}
                        </strong>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Proposed In:</span>
                          <strong className="font-mono-num text-slate-800 dark:text-slate-200">{r.proposedClockIn}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Proposed Out:</span>
                          <strong className="font-mono-num text-slate-800 dark:text-slate-200">{r.proposedClockOut}</strong>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed">
                        <strong>Remarks: </strong> {r.reason}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApproveRegularization(r.id)}
                        disabled={actionId === r.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Punch</span>
                      </button>
                      <button
                        onClick={() => {
                          setRejectItem({ id: r.id, type: 'REGULARIZATION' });
                          setRejectModalOpen(true);
                        }}
                        disabled={actionId === r.id}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
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
            </div>
          )}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Reason for Decline / Rejection</h3>
            <form onSubmit={handleConfirmReject} className="space-y-3 text-xs">
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Provide constructive justification for declining this team member request..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalOpen(false);
                    setRejectItem(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-white font-bold bg-rose-600 hover:bg-rose-700"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
