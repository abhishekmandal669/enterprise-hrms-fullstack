import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  ArrowLeft,
  X,
  CalendarDays,
  AlertCircle,
  Clock,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  ShieldCheck,
  User,
  Info,
  Calendar,
  Paperclip,
  Trash2,
  Palmtree,
  BriefcaseMedical,
  Coffee,
  Award,
  ChevronRight,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { CustomSelect } from './CustomSelect';

interface ApplyLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ApplyLeaveModal: React.FC<ApplyLeaveModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { addToast } = useSocket();

  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [leaveTypeCode, setLeaveTypeCode] = useState('PL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [halfDaySlot, setHalfDaySlot] = useState('FIRST_HALF');
  const [reason, setReason] = useState('');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Common quick-fill reasons
  const quickReasons = [
    'Personal Work / Urgent Matter',
    'Medical Checkup / Unwell',
    'Family Event / Wedding',
    'Travel / Out of Station',
    'Home Maintenance'
  ];

  useEffect(() => {
    if (isOpen) {
      const fetchBalances = async () => {
        try {
          const res = await api.get('/leaves/balances');
          if (res.data.success) {
            setLeaveBalances(res.data.data);
          }
        } catch (err) {
          console.error('Failed to load leave balances:', err);
        }
      };
      fetchBalances();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Calculate requested duration
  let requestedDays = 0;
  if (fromDate && toDate) {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = end.getTime() - start.getTime();
    if (diffTime >= 0) {
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      requestedDays = isHalfDay ? 0.5 : days;
    }
  }

  const selectedBalance = leaveBalances.find(b => b.leaveType?.code === leaveTypeCode);
  const annualQuota = selectedBalance?.totalAllocated || 12;
  const usedDays = selectedBalance?.used || 0;
  const pendingDays = selectedBalance?.pendingApproval || 0;
  const availableQuota = selectedBalance
    ? Math.max(0, selectedBalance.totalAllocated - selectedBalance.used - selectedBalance.pendingApproval)
    : 10;
  const projectedBalanceAfter = Math.max(0, availableQuota - requestedDays);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromDate || !toDate || !reason.trim()) {
      addToast('Validation Error', 'Please complete all required fields.', 'warning');
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      addToast('Invalid Dates', 'End date cannot be earlier than start date.', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      let attachmentUrl: string | undefined = undefined;

      if (attachmentFile) {
        const formData = new FormData();
        formData.append('file', attachmentFile);
        formData.append('title', `Medical Attachment - ${leaveTypeCode} (${fromDate})`);
        formData.append('category', leaveTypeCode === 'SL' ? 'MEDICAL_CERTIFICATE' : 'OTHER');
        const uploadRes = await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (uploadRes.data.success) {
          attachmentUrl = uploadRes.data.data.fileUrl;
        }
      }

      const res = await api.post('/leaves/apply', {
        leaveTypeCode,
        fromDate,
        toDate,
        isHalfDay,
        halfDaySlot: isHalfDay ? halfDaySlot : undefined,
        reason: reason.trim(),
        attachmentUrl
      });

      if (res.data.success) {
        addToast('Leave Applied', 'Application submitted to your manager for approval.', 'success');
        onSuccess();
        onClose();
        setFromDate('');
        setToDate('');
        setReason('');
        setIsHalfDay(false);
        setAttachmentFile(null);
      }
    } catch (err: any) {
      addToast('Application Failed', err.response?.data?.message || 'Failed to submit leave.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLeaveTypeIcon = (code: string) => {
    switch (code) {
      case 'PL':
        return <Palmtree className="w-5 h-5 text-indigo-500" />;
      case 'CL':
        return <Coffee className="w-5 h-5 text-amber-500" />;
      case 'SL':
        return <BriefcaseMedical className="w-5 h-5 text-rose-500" />;
      case 'COMP_OFF':
        return <Award className="w-5 h-5 text-emerald-500" />;
      default:
        return <CalendarDays className="w-5 h-5 text-indigo-500" />;
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
            <span>Back to Leave Management</span>
          </button>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <span>Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span>Leaves & Attendance</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Apply for Leave</span>
          </div>
        </div>

        {/* Right: Shift badge + Close button */}
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
          
          {/* Hero Title Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  New Application
                </span>
                <span className="text-xs text-slate-400 font-mono-num">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                Submit Leave Application
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Select your leave type, configure requested duration, attach medical proof if required, and submit directly to your reporting manager.
              </p>
            </div>

            {/* Applicant Identity Card */}
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
              
              {/* Step 1: Select Leave Category & Quota */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Leave Category & Quota Ledger
                    </h2>
                  </div>
                  <span className="text-xs text-slate-400">Click to select category</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {[
                    { code: 'PL', name: 'Paid Leave (PL)', fallback: 12, desc: 'Earned & planned vacation leave' },
                    { code: 'CL', name: 'Casual Leave (CL)', fallback: 8, desc: 'Short personal & urgent affairs' },
                    { code: 'SL', name: 'Sick Leave (SL)', fallback: 6, desc: 'Medical illness & recovery' },
                    { code: 'COMP_OFF', name: 'Compensatory Off', fallback: 0, desc: 'Weekend & holiday shift credit' }
                  ].map(cat => {
                    const bal = leaveBalances.find(b => b.leaveType?.code === cat.code);
                    const avail = bal ? Math.max(0, bal.totalAllocated - bal.used - bal.pendingApproval) : cat.fallback;
                    const isSelected = leaveTypeCode === cat.code;

                    return (
                      <div
                        key={cat.code}
                        onClick={() => setLeaveTypeCode(cat.code)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 shadow-sm ring-4 ring-indigo-500/10'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200/60 dark:border-slate-700">
                              {getLeaveTypeIcon(cat.code)}
                            </div>
                            <div>
                              <strong className="text-sm font-bold text-slate-900 dark:text-white block">
                                {cat.name}
                              </strong>
                              <span className="text-xs text-slate-400 block mt-0.5">
                                {cat.desc}
                              </span>
                            </div>
                          </div>

                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                          )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                          <span className="text-xs text-slate-500 font-medium">Available Balance:</span>
                          <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono-num">
                            {avail} Days
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Date & Duration Configuration */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Duration & Dates
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      From Date <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => {
                          setFromDate(e.target.value);
                          if (!toDate || toDate < e.target.value) setToDate(e.target.value);
                        }}
                        required
                        className="w-full px-4 py-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      To Date <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        required
                        className="w-full px-4 py-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Half Day Option */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHalfDay}
                      onChange={(e) => setIsHalfDay(e.target.checked)}
                      className="w-4 h-4 rounded-md border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <strong className="text-xs font-bold text-slate-900 dark:text-white block">
                        Half-Day Application (0.5 Days)
                      </strong>
                      <span className="text-[11px] text-slate-400 block">
                        Deducts only half a day for partial shift absence.
                      </span>
                    </div>
                  </label>

                  {isHalfDay && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 shrink-0">Slot:</span>
                      <div className="w-[220px]">
                        <CustomSelect
                          value={halfDaySlot}
                          onChange={(val) => setHalfDaySlot(val)}
                          size="sm"
                          options={[
                            { value: 'FIRST_HALF', label: 'First Half (09:00 - 13:30)' },
                            { value: 'SECOND_HALF', label: 'Second Half (14:00 - 18:00)' },
                          ]}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Requested Duration Impact Card */}
                {requestedDays > 0 && (
                  <div
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      requestedDays > availableQuota
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                        : 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {requestedDays > availableQuota ? (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      ) : (
                        <Calendar className="w-5 h-5 text-indigo-600 shrink-0" />
                      )}
                      <div>
                        <strong className="text-xs font-bold block">
                          {requestedDays > availableQuota
                            ? `Quota Exceeded: Requested ${requestedDays} days (${requestedDays - availableQuota}d extra)`
                            : `Applying for ${requestedDays} ${requestedDays === 1 ? 'business day' : 'business days'}`}
                        </strong>
                        <span className="text-[11px] opacity-80 block">
                          Dates: {fromDate} to {toDate}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] block opacity-80">Remaining Quota</span>
                      <span className="text-base font-black font-mono-num">
                        {projectedBalanceAfter} Days
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 3: Reason for Absence & Quick Suggestions */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">3</span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Reason for Absence <span className="text-rose-500">*</span>
                  </h2>
                </div>

                {/* Quick Suggestion Chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-400">Quick Tags:</span>
                  {quickReasons.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setReason(q)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                    >
                      {q}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide clear rationale for your planned absence for your manager's approval..."
                  required
                  className="w-full p-4 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                />
              </div>

              {/* Step 4: Medical Certificate & Supporting Document Attachment */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">4</span>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Supporting Document Attachment
                    </h2>
                  </div>
                  {leaveTypeCode === 'SL' && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-900">
                      Doctor Slip / Medical Cert Recommended
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Attach doctor prescription, medical certificate, travel itinerary, or event invitation. Uploaded files are archived into your personal Document Vault.
                </p>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 dark:bg-slate-800/40 transition group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAttachmentFile(e.target.files[0]);
                      }
                    }}
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.doc"
                    className="hidden"
                  />

                  {attachmentFile ? (
                    <div className="flex items-center gap-3">
                      <Paperclip className="w-6 h-6 text-indigo-600" />
                      <div className="text-left">
                        <strong className="text-xs font-bold text-slate-900 dark:text-white block">
                          {attachmentFile.name}
                        </strong>
                        <span className="text-[10px] text-slate-400">
                          {(attachmentFile.size / 1024).toFixed(1)} KB · Click to replace
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAttachmentFile(null);
                        }}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition ml-4"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition mb-2 mx-auto" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        Upload Document (Optional)
                      </span>
                      <span className="text-[11px] text-slate-400">PDF, JPG, PNG, DOCX up to 15MB</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Real-time Quota Ledger & Policy Sidebar */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
              
              {/* Card 1: Live Quota Ledger Breakdown */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                    Live Quota Ledger
                  </h3>
                  <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">
                    {leaveTypeCode}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Annual Allocated Quota:</span>
                    <span className="font-mono-num font-bold text-slate-800 dark:text-slate-200">{annualQuota} Days</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Utilized So Far:</span>
                    <span className="font-mono-num font-bold text-slate-800 dark:text-slate-200">{usedDays} Days</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Pending Approval:</span>
                    <span className="font-mono-num font-bold text-amber-600 dark:text-amber-400">{pendingDays} Days</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Current Available:</span>
                    <span className="font-mono-num font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {availableQuota} Days
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">Requested Deduction:</span>
                    <span className="font-mono-num font-bold text-indigo-600 dark:text-indigo-400 text-sm">
                      - {requestedDays} Days
                    </span>
                  </div>
                  <div className="flex justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-900 dark:text-white">Balance After Approval:</span>
                    <span className="font-mono-num font-black text-slate-900 dark:text-white">
                      {projectedBalanceAfter} Days
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Approver Route */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" />
                  Approval Routing
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  This application will be routed in real-time to your direct reporting manager's Approval Center.
                </p>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Multi-Tier Routing Active</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    If your manager is on active delegation, authorized delegate will review. HR Admin override enabled.
                  </span>
                </div>
              </div>

              {/* Card 3: Company Policy Reminders */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-6 rounded-3xl border border-indigo-200/60 dark:border-indigo-900/40 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-600" />
                  Policy Guidelines
                </h3>
                <ul className="text-xs text-indigo-950/80 dark:text-indigo-300/80 space-y-2 list-disc list-inside">
                  <li><strong>Paid Leave (PL):</strong> Submit at least 3 business days in advance.</li>
                  <li><strong>Sick Leave (SL):</strong> Medical slip recommended for leaves exceeding 2 consecutive days.</li>
                  <li><strong>Weekend Sandwich:</strong> Leaves spanning Friday to Monday count normal business days only.</li>
                </ul>
              </div>

            </div>

          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="sticky bottom-6 z-30 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Info className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                By submitting, your quota is reserved as pending approval and notification dispatched via WebSocket.
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
                disabled={isSubmitting || requestedDays === 0 || requestedDays > availableQuota}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Submit Leave Application</span>
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
