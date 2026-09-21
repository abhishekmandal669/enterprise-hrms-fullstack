import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeft,
  X,
  Briefcase,
  Sparkles,
  CheckCircle2,
  Loader2,
  Calendar,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { CustomSelect } from './CustomSelect';

interface SubmitTimesheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const SubmitTimesheetModal: React.FC<SubmitTimesheetModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { addToast } = useSocket();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingProjects, setFetchingProjects] = useState(false);

  // Form State
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [projectId, setProjectId] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [totalHours, setTotalHours] = useState(8);
  const [productiveHours, setProductiveHours] = useState(7.5);
  const [activityType, setActivityType] = useState('DEVELOPMENT');
  const [isBillable, setIsBillable] = useState(true);

  // Common quick task templates
  const quickTasks = [
    'Feature Implementation & Unit Tests',
    'Bug Investigation & Hotfix Deployment',
    'Sprint Planning & Architecture Sync',
    'Code Review & Pull Request Verification',
    'Client Demo & Milestone Review'
  ];

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchProjects = async () => {
    try {
      setFetchingProjects(true);
      const res = await api.get('/timesheets/projects');
      if (res.data.success && res.data.data.length > 0) {
        setProjects(res.data.data);
        setProjectId(res.data.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setFetchingProjects(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !activityDescription.trim()) {
      addToast('Validation Error', 'Task title and activity description are required.', 'warning');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        logDate,
        projectId: projectId || undefined,
        taskTitle: taskTitle.trim(),
        activityDescription: activityDescription.trim(),
        totalMinutes: Math.round(totalHours * 60),
        productiveMinutes: Math.round(productiveHours * 60),
        activityType,
        isBillable
      };

      const res = await api.post('/timesheets', payload);
      if (res.data.success) {
        addToast('Timesheet Logged', 'End-of-day work log submitted successfully.', 'success');
        if (onSuccess) onSuccess();
        onClose();
        setTaskTitle('');
        setActivityDescription('');
      }
    } catch (err: any) {
      addToast('Submission Failed', err.response?.data?.message || 'Failed to submit timesheet.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const activityOptions = [
    { value: 'DEVELOPMENT', label: 'Feature Development' },
    { value: 'CODE_REVIEW', label: 'Code Review & PRs' },
    { value: 'MEETING', label: 'Client / Team Meeting' },
    { value: 'TESTING_QA', label: 'QA & Testing' },
    { value: 'RESEARCH', label: 'R&D & Architecture' },
    { value: 'SUPPORT', label: 'Bugfix & Support' },
    { value: 'DOCUMENTATION', label: 'Documentation' }
  ];

  const selectedProject = projects.find(p => p.id === projectId);
  const breakMinutes = Math.max(0, Math.round((totalHours - productiveHours) * 60));
  const efficiencyPercent = totalHours > 0 ? Math.min(100, Math.round((productiveHours / totalHours) * 100)) : 0;

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
            <span>Back to Timesheets</span>
          </button>

          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <span>Core Workspace</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span>Timesheets</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Log Daily Deliverables</span>
          </div>
        </div>

        {/* Right: Date pill + Close button */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>Shift: {logDate}</span>
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
                  Daily Work Submission
                </span>
                <span className="text-xs text-slate-400 font-mono-num">
                  Real-time Productivity & Billing Logger
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                Log Today's Work & Project Deliverables
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Record your daily project hours, task milestones, and billable work for manager sign-off.
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
              
              {/* Step 1: Date & Project Stream */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">1</span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Project & Shift Date
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Log Date <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={logDate}
                      onChange={(e) => setLogDate(e.target.value)}
                      required
                      className="w-full px-4 py-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Target Project <span className="text-rose-500">*</span>
                    </label>
                    <CustomSelect
                      value={projectId}
                      onChange={(val) => setProjectId(val)}
                      disabled={fetchingProjects}
                      placeholder="Select target project..."
                      options={projects.map((p) => ({
                        value: p.id,
                        label: p.name,
                        sublabel: p.clientName ? `Client: ${p.clientName}` : undefined,
                        badge: p.code,
                        badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                      }))}
                    />
                  </div>
                </div>

                {/* Activity Domain Badges */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Activity Domain
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {activityOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setActivityType(opt.value)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold text-center border transition ${
                          activityType === opt.value
                            ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border-indigo-500 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 2: Task Description & Deliverables */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">2</span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Task Milestone & Work Accomplished
                  </h2>
                </div>

                {/* Quick Templates */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-slate-400">Quick Templates:</span>
                  {quickTasks.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTaskTitle(t)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Task Title / Deliverable <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Implement OAuth 2.0 Auth Flow & Multi-tenant RBAC"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    className="w-full px-4 py-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Detailed Work Accomplished & Output Summary <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Document specific PRs merged, bug tickets closed, modules delivered, or client feedback resolved..."
                    value={activityDescription}
                    onChange={(e) => setActivityDescription(e.target.value)}
                    className="w-full p-4 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                  />
                </div>

                {/* Billable Toggle */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-indigo-600" />
                    <div>
                      <strong className="text-xs font-bold text-slate-900 dark:text-white block">
                        Client Billable Work
                      </strong>
                      <span className="text-[11px] text-slate-400 block">
                        Flags this work entry for customer invoice reporting.
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isBillable}
                      onChange={(e) => setIsBillable(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600" />
                  </label>
                </div>
              </div>

              {/* Step 3: Hours & Productivity Configuration */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">3</span>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Hours & Productivity Breakdown
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Total Shift Duration
                      </label>
                      <span className="text-xs font-black font-mono-num text-indigo-600 dark:text-indigo-400">
                        {totalHours} hrs
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="14"
                      step="0.5"
                      value={totalHours}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setTotalHours(val);
                        if (productiveHours > val) setProductiveHours(val);
                      }}
                      className="w-full accent-indigo-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>1 hr</span>
                      <span>8 hrs standard</span>
                      <span>14 hrs</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Core Productive Time
                      </label>
                      <span className="text-xs font-black font-mono-num text-emerald-600 dark:text-emerald-400">
                        {productiveHours} hrs
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max={totalHours}
                      step="0.5"
                      value={productiveHours}
                      onChange={(e) => setProductiveHours(parseFloat(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                      <span>0.5 hr</span>
                      <span>Net work time</span>
                      <span>{totalHours} hrs max</span>
                    </div>
                  </div>
                </div>

                {/* Efficiency Progress Bar */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Productive Efficiency Rating
                    </span>
                    <span className="font-mono-num font-bold text-indigo-600 dark:text-indigo-400">
                      {efficiencyPercent}% ({productiveHours}h productive / {breakMinutes}m break)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${efficiencyPercent}%` }}
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Real-time Context Sidebar */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
              
              {/* Card 1: Live Project Summary */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-indigo-500" />
                    Project Allocation
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                    Active
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Project Name:</span>
                    <strong className="text-slate-900 dark:text-white">{selectedProject?.name || 'Selected Project'}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Client:</span>
                    <span>{selectedProject?.clientName || 'Internal Enterprise'}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Billable Rate:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {isBillable ? 'Standard Billable' : 'Non-Billable Overhead'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Timesheet Governance */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  Compliance Verification
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Timesheets are cross-verified against biometric clock-in timestamps before payroll calculation.
                </p>
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Manager Review Required</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">
                    Once submitted, your direct project manager will review and approve hours logged.
                  </span>
                </div>
              </div>

              {/* Card 3: Tips for Accurate Logging */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/30 p-6 rounded-3xl border border-indigo-200/60 dark:border-indigo-900/40 shadow-xs space-y-3">
                <h3 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Submission Guidelines
                </h3>
                <ul className="text-xs text-indigo-950/80 dark:text-indigo-300/80 space-y-2 list-disc list-inside">
                  <li>Log daily by 19:00 to ensure compliant timesheet audit status.</li>
                  <li>Mention Jira / GitHub issue IDs in task title when applicable.</li>
                  <li>Deduct lunch and extended breaks accurately from core hours.</li>
                </ul>
              </div>

            </div>

          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="sticky bottom-6 z-30 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <AlertCircle className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>
                Daily timesheet will be registered on date {logDate} with {productiveHours}h productive work.
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
                disabled={loading || !taskTitle.trim() || !activityDescription.trim()}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting Log...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Submit Daily Timesheet</span>
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
