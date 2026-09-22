import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  X,
  Clock,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  User,
  Info,
  ChevronRight,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { CustomTimePicker } from './CustomTimePicker';

interface RegularizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  defaultDate?: string;
}

export const RegularizationModal: React.FC<RegularizationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultDate
}) => {
  const { user } = useAuth();
  const { addToast } = useSocket();

  const [attendanceDate, setAttendanceDate] = useState(defaultDate || new Date().toISOString().split('T')[0]);
  const [regularizationType, setRegularizationType] = useState<'MISSED_IN' | 'MISSED_OUT' | 'BOTH_MISSED' | 'LATE_WAIVER'>('MISSED_IN');
  const [proposedClockIn, setProposedClockIn] = useState('09:00');
  const [proposedClockOut, setProposedClockOut] = useState('18:00');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick tags for rapid justification
  const quickReasons = [
    'Biometric Scanner Device Offline',
    'Client Site / External Meeting',
    'Public Transit / Severe Traffic Delay',
    'Office Power Outage / Network Glitch',
    'Medical Emergency / Immediate Urgency'
  ];

  useEffect(() => {
    if (defaultDate) {
      setAttendanceDate(defaultDate);
    }
  }, [defaultDate, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate duration from proposed times
  const calculateProposedDuration = () => {
    if (!proposedClockIn || !proposedClockOut) return 0;
    const [inH, inM] = proposedClockIn.split(':').map(Number);
    const [outH, outM] = proposedClockOut.split(':').map(Number);
    let startMin = inH * 60 + inM;
    let endMin = outH * 60 + outM;
    if (endMin < startMin) endMin += 24 * 60; // Crosses midnight
    const diffHours = (endMin - startMin) / 60;
    return Math.max(0, parseFloat(diffHours.toFixed(1)));
  };

  const proposedHours = calculateProposedDuration();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceDate || !proposedClockIn || !proposedClockOut || !reason.trim()) {
      addToast('Validation Error', 'Please complete all required fields with detailed explanation.', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/attendance/regularize', {
        attendanceDate,
        proposedClockIn,
        proposedClockOut,
        reason: `[${regularizationType}] ${reason.trim()}`
      });

      if (res.data.success) {
        addToast('Request Submitted', res.data.message || 'Regularization request sent to manager for approval.', 'success');
        onSuccess();
        onClose();
        setReason('');
      }
    } catch (err: any) {
      addToast('Submission Failed', err.response?.data?.message || 'Failed to submit regularization.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-50 dark:bg-slate-950 flex flex-col w-screen h-screen overflow-hidden animate-in fade-in duration-200">
      
      {/* 1. Full Page Navigation Header */}
      <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 shadow-xs">
        {/* Left: Back button + Breadcrumb */}
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700/80 rounded-xl border border-slate-200 dark:border-slate-700 transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Attendance</span>
          </button>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <span>Core Workspace</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span>Attendance & Shifts</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Request Punch Regularization</span>
          </div>
        </div>

        {/* Right: Date pill + Close button */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>Shift 09:00 AM - 06:00 PM</span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 2. Full Screen Workspace (Scrollable Two-Column Layout) */}
      <main className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit} className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8">
          
          {/* Hero Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Punch Correction Workflow
                </span>
                <span className="text-xs text-slate-400 font-mono-num">
                  Date: {attendanceDate}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                Request Attendance Punch Regularization
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Submit an official correction for a missed biometric punch, system outage, or client visit.
              </p>
            </div>

            {/* User Identity Snapshot */}
            {user && (
              <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs self-start md:self-auto">
                <img
                  src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'}
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-500/20"
                />
                <div>
                  <strong className="block text-xs font-bold text-slate-900 dark:text-white">
                    {user.name}
                  </strong>
                  <span className="text-[11px] text-slate-400 block">
                    {user.employeeCode} · {user.designation}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Grid Layout: Left Main Form (8 cols) + Right Context Sidebar (4 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: Main Form Inputs */}
            <div className="lg:col-span-8 space-y-8">
              
              {/* Step 1: Incident Category & Date */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Incident Type & Target Date
                  </h2>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Date of Occurrence <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="w-full sm:w-80 px-4 py-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Type of Punch Discrepancy <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { id: 'MISSED_IN', label: 'Missed Clock-In Punch', desc: 'Clocked out in evening, but forgot morning clock-in' },
                      { id: 'MISSED_OUT', label: 'Missed Clock-Out Punch', desc: 'Clocked in morning, but forgot evening sign-out' },
                      { id: 'BOTH_MISSED', label: 'Both Punches Missing', desc: 'Full shift present at client site or external work' },
                      { id: 'LATE_WAIVER', label: 'Late Arrival Waiver', desc: 'Arrived after grace threshold due to transit / urgency' }
                    ].map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setRegularizationType(t.id as any)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                          regularizationType === t.id
                            ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-xs ring-4 ring-indigo-500/10'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <strong className="text-xs font-bold text-slate-900 dark:text-white block">
                            {t.label}
                          </strong>
                          {regularizationType === t.id && (
                            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 mt-2 block">
                          {t.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 2: Proposed Timestamps */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Corrected Timestamps & Hours
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Corrected Clock-In Time <span className="text-rose-500">*</span>
                    </label>
                    <CustomTimePicker
                      value={proposedClockIn}
                      onChange={(val) => setProposedClockIn(val)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Corrected Clock-Out Time <span className="text-rose-500">*</span>
                    </label>
                    <CustomTimePicker
                      value={proposedClockOut}
                      onChange={(val) => setProposedClockOut(val)}
                    />
                  </div>
                </div>

                {/* Duration Indicator */}
                <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-900 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-indigo-600" />
                    <div>
                      <strong className="text-xs font-bold text-slate-900 dark:text-white block">
                        Corrected Shift Duration
                      </strong>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                        Net shift duration after applying proposed punch adjustments.
                      </span>
                    </div>
                  </div>
                  <span className="text-base font-black font-mono-num text-indigo-600 dark:text-indigo-400">
                    {proposedHours} hrs
                  </span>
                </div>
              </div>

              {/* Step 3: Justification & Reason */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">3</span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Formal Reason & Justification <span className="text-rose-500">*</span>
                  </h2>
                </div>

                {/* Quick Suggestion Chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-400">Quick Tags:</span>
                  {quickReasons.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={4}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="State the exact reason for the missing punch or late arrival for your manager's audit trail..."
                  className="w-full p-4 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                />
              </div>

            </div>

            {/* RIGHT COLUMN: Real-time Context Sidebar */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
              
              {/* Card 1: Shift Policy Snapshot */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                    Shift Policy Parameters
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    Active
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Assigned Shift:</span>
                    <strong className="text-slate-900 dark:text-white">General Morning (09:00 AM - 06:00 PM)</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Grace Period:</span>
                    <span>15 Minutes (till 09:15 AM)</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Half-Day Cutoff:</span>
                    <span>01:00 PM</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Approval Routing */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" />
                  Approval Hierarchy
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Regularization requests are reviewed and approved directly by your reporting manager or HR Admin.
                </p>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Audit Trail Logged</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Once approved, your attendance status will update to 'PRESENT' and hours recalculated.
                  </span>
                </div>
              </div>

              {/* Card 3: Governance Guidelines */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-6 rounded-3xl border border-indigo-200/60 dark:border-indigo-900/40 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  Regularization Rules
                </h3>
                <ul className="text-xs text-indigo-950/80 dark:text-indigo-300/80 space-y-2 list-disc list-inside">
                  <li>Maximum 3 regularizations allowed per calendar month.</li>
                  <li>Requests must be raised within 7 days of the missed punch.</li>
                  <li>Repeated unexcused late punches may trigger automated half-day leave deductions.</li>
                </ul>
              </div>

            </div>

          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="sticky bottom-6 z-30 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Info className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                Submitting will send a high-priority regularization notification to your manager's approval queue.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                Cancel & Return
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !reason.trim()}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Request...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Submit Regularization</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </main>

    </div>,
    document.body
  );
};
