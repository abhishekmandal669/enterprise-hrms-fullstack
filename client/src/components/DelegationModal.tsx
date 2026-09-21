import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  UserCheck,
  X,
  Loader2,
  ShieldAlert,
  ArrowLeft,
  ChevronRight,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { CustomSelect } from './CustomSelect';

interface DelegationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDelegationChanged?: () => void;
}

interface DelegationItem {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  createdAt: string;
  delegatee?: {
    id: string;
    firstName: string;
    lastName: string;
    designation: string;
  };
  delegator?: {
    id: string;
    firstName: string;
    lastName: string;
    designation: string;
  };
}

export const DelegationModal: React.FC<DelegationModalProps> = ({
  isOpen,
  onClose,
  onDelegationChanged
}) => {
  const { addToast } = useSocket();

  const [activeTab, setActiveTab] = useState<'NEW' | 'GIVEN' | 'RECEIVED'>('NEW');
  const [givenDelegations, setGivenDelegations] = useState<DelegationItem[]>([]);
  const [receivedDelegations, setReceivedDelegations] = useState<DelegationItem[]>([]);
  const [eligibleUsers, setEligibleUsers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [delegateeId, setDelegateeId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [reason, setReason] = useState('');

  const fetchDelegations = async () => {
    try {
      const res = await api.get('/leaves/delegations');
      if (res.data.success) {
        setGivenDelegations(res.data.data.given);
        setReceivedDelegations(res.data.data.received);
        if (res.data.data.given.length > 0) {
          setActiveTab('GIVEN');
        }
      }
    } catch (err: any) {
      console.error('Error fetching delegations:', err);
    }
  };

  const fetchEligibleUsers = async () => {
    try {
      const res = await api.get('/leaves/delegations/eligible-users');
      if (res.data.success) {
        setEligibleUsers(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching eligible users:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDelegations();
      fetchEligibleUsers();
    }
  }, [isOpen]);

  const handleCreateDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegateeId) {
      addToast('Validation', 'Please select an eligible colleague.', 'warning');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      addToast('Validation', 'Start date cannot be after end date.', 'warning');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/leaves/delegations', {
        delegateeId,
        startDate,
        endDate,
        reason
      });

      if (res.data.success) {
        addToast('Delegation Granted', 'Approval authority successfully delegated.', 'success');
        setDelegateeId('');
        setReason('');
        fetchDelegations();
        setActiveTab('GIVEN');
        if (onDelegationChanged) onDelegationChanged();
      }
    } catch (err: any) {
      addToast('Delegation Failed', err.response?.data?.message || 'Failed to create delegation.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm('Are you sure you want to revoke this approval delegation early?')) {
      return;
    }
    try {
      const res = await api.put(`/leaves/delegations/${id}/revoke`);
      if (res.data.success) {
        addToast('Revocation Successful', 'Delegation revoked early.', 'success');
        fetchDelegations();
        if (onDelegationChanged) onDelegationChanged();
      }
    } catch (err: any) {
      addToast('Revocation Error', err.response?.data?.message || 'Failed to revoke delegation.', 'danger');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-50 dark:bg-slate-950 flex flex-col w-screen h-screen overflow-hidden animate-in fade-in duration-200">
      
      {/* Top Page Header */}
      <header className="shrink-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 sm:px-8 flex items-center justify-between z-20 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Leaves</span>
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-slate-400">Leaves & Absence</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Approval Delegation (Act-as Authority)</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 rounded-full text-xs text-indigo-700 dark:text-indigo-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Active Delegations: {givenDelegations.filter(d => d.status === 'ACTIVE').length}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Page Workspace */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8">
          
          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center font-bold shadow-inner">
                <UserCheck className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Approval Delegation Workspace</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Act-As Authority
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-indigo-200/70 mt-1">
                  Empower designated peer managers to approve team leave requests while you are on leave or traveling
                </p>
              </div>
            </div>
          </div>

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
            <button
              onClick={() => setActiveTab('NEW')}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition ${
                activeTab === 'NEW'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              + Delegate Authority
            </button>

            <button
              onClick={() => setActiveTab('GIVEN')}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition ${
                activeTab === 'GIVEN'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              My Delegations ({givenDelegations.length})
            </button>

            <button
              onClick={() => setActiveTab('RECEIVED')}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition ${
                activeTab === 'RECEIVED'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              Incoming Delegations ({receivedDelegations.length})
            </button>
          </div>

          {/* Tab 1: New Delegation Form */}
          {activeTab === 'NEW' && (
            <form onSubmit={handleCreateDelegation} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left (8 cols): Delegation Parameters */}
                <div className="lg:col-span-8 space-y-6">
                  
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
                    <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="block font-bold">Act-As Legal Authority Transfer</strong>
                      <span>
                        During the effective dates below, the selected colleague will have official authorization to approve, reject, and review leave applications on your behalf for your direct reportees.
                      </span>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-indigo-500" />
                      <span>Delegatee Colleague Assignment</span>
                    </h3>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                        Select Delegatee Colleague <span className="text-rose-500">*</span>
                      </label>
                      <CustomSelect
                        value={delegateeId}
                        onChange={(val) => setDelegateeId(val)}
                        placeholder="Choose Peer Manager / HR Executive..."
                        options={[
                          { value: '', label: '-- Choose Peer Manager / HR Executive --' },
                          ...eligibleUsers.map((u) => ({
                            value: u.id,
                            label: `${u.firstName} ${u.lastName}`,
                            sublabel: `${u.designation || 'Colleague'} · ${u.role}`,
                            badge: u.role,
                            badgeColor: u.role === 'MANAGER' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                          }))
                        ]}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Effective From <span className="text-rose-500">*</span></span>
                        </label>
                        <input
                          type="date"
                          required
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500/30"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Valid Until <span className="text-rose-500">*</span></span>
                        </label>
                        <input
                          type="date"
                          required
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500/30"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                        Formal Reason & Business Context
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g. Annual leave, international client onsite travel, medical leave..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="w-full p-4 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 leading-relaxed focus:ring-2 focus:ring-indigo-500/30 font-sans"
                      />
                    </div>
                  </div>

                </div>

                {/* Right (4 cols): Delegation Governance */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800">
                      Delegation Policy
                    </h4>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-3">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <span>All actions taken during delegation are tagged with an audit trail: <em>"Approved by [Delegatee] on behalf of [You]"</em>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <span>You can revoke this delegation at any moment before its expiry date.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                        <span>Upon expiration date 23:59, approval authority automatically reverts to you.</span>
                      </li>
                    </ul>
                  </div>
                </div>

              </div>

              {/* Sticky Action Footer */}
              <div className="sticky bottom-6 z-30 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl flex items-center justify-between">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel & Return
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/30 transition transform active:scale-95 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Confirming Delegation...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Confirm & Activate Delegation</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

          {/* Tab 2: My Delegations Given */}
          {activeTab === 'GIVEN' && (
            <div className="space-y-4">
              {givenDelegations.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <UserCheck className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Delegations Created</h3>
                  <p className="text-xs text-slate-500 mt-1">You currently have no active or historical delegations.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {givenDelegations.map((d) => (
                    <div
                      key={d.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <strong className="text-sm font-bold text-slate-900 dark:text-white block">
                            {d.delegatee?.firstName} {d.delegatee?.lastName}
                          </strong>
                          <span className="text-xs text-slate-500">
                            {d.delegatee?.designation}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            d.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Active Span: <strong>{d.startDate}</strong> to <strong>{d.endDate}</strong></span>
                      </div>

                      {d.reason && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                          "{d.reason}"
                        </p>
                      )}

                      {d.status === 'ACTIVE' && (
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => handleRevoke(d.id)}
                            className="px-3 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 rounded-xl transition"
                          >
                            Revoke Delegation Early
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Incoming Delegations Received */}
          {activeTab === 'RECEIVED' && (
            <div className="space-y-4">
              {receivedDelegations.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Incoming Delegations</h3>
                  <p className="text-xs text-slate-500 mt-1">No peer managers have currently delegated approval authority to you.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {receivedDelegations.map((d) => (
                    <div
                      key={d.id}
                      className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <strong className="text-sm font-bold text-slate-900 dark:text-white block">
                            Granted by: {d.delegator?.firstName} {d.delegator?.lastName}
                          </strong>
                          <span className="text-xs text-slate-500">
                            {d.delegator?.designation}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                            d.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                              : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Active Window: <strong>{d.startDate}</strong> to <strong>{d.endDate}</strong></span>
                      </div>

                      {d.reason && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                          "{d.reason}"
                        </p>
                      )}

                      {d.status === 'ACTIVE' && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>You can approve/reject reportee leaves for this manager directly from your Leaves inbox.</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
};
