import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  X, UserPlus, Copy, Check, Link as LinkIcon,
  ArrowLeft, ChevronRight, ShieldCheck, Mail, Briefcase, Building, User, Sparkles
} from 'lucide-react';
import { CustomSelect } from './CustomSelect';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { addToast } = useSocket();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [designation, setDesignation] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [reportingManagerId, setReportingManagerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown options
  const [dropdowns, setDropdowns] = useState<any>({
    departments: [],
    managers: []
  });

  // Success state: display invite link
  const [createdInvite, setCreatedInvite] = useState<{ email: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchDropdowns();
      setCreatedInvite(null);
    }
  }, [isOpen]);

  const fetchDropdowns = async () => {
    try {
      const res = await api.get('/master/dropdowns');
      if (res.data.success) {
        setDropdowns(res.data.data);
        if (res.data.data.departments?.length > 0) {
          setDepartmentId(res.data.data.departments[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load dropdowns', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email) {
      addToast('Validation Error', 'First name, last name, and email are mandatory.', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/employees', {
        firstName,
        lastName,
        email,
        role,
        designation,
        departmentId: departmentId || undefined,
        reportingManagerId: reportingManagerId || undefined
      });

      if (res.data.success) {
        addToast('Employee Created', 'Activation token generated successfully.', 'success');
        setCreatedInvite({
          email: res.data.data.email,
          link: res.data.data.inviteLink
        });
        onSuccess();
      }
    } catch (err: any) {
      addToast('Creation Failed', err.response?.data?.message || 'Failed to create employee.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (createdInvite) {
      navigator.clipboard.writeText(createdInvite.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addToast('Copied', 'Invite link copied to clipboard.', 'info');
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
            <span>Back to Employees</span>
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-slate-400">Team Directory</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">Onboard New Colleague</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 rounded-full text-xs text-indigo-700 dark:text-indigo-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Role: {role}</span>
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
                <UserPlus className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Onboard New Employee</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Full Page Workspace
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-indigo-200/70 mt-1">
                  Provision new employee identity, establish reporting hierarchy, and dispatch a 72-hour activation link
                </p>
              </div>
            </div>
          </div>

          {createdInvite ? (
            /* Success Activation Dossier */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 shadow-sm max-w-2xl mx-auto text-center space-y-6">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Employee Account Created!</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                  Status is set to <strong className="text-amber-600 dark:text-amber-400">INVITED</strong>. Share this single-use activation URL with <strong className="text-indigo-600 dark:text-indigo-400">{createdInvite.email}</strong> to set up their corporate password.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-left flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <LinkIcon className="w-5 h-5 text-indigo-500 shrink-0" />
                  <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate select-all">
                    {createdInvite.link}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center gap-1.5 shrink-0 transition shadow-md shadow-indigo-600/30"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy Link'}</span>
                </button>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 text-left">
                <strong>Important:</strong> This activation token expires automatically after 72 hours. Upon initial login and password initialization, employee status transitions to <strong>ACTIVE</strong>.
              </div>

              <div className="pt-4 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3 text-xs font-bold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition shadow-md"
                >
                  Finish & Return to Directory
                </button>
              </div>
            </div>
          ) : (
            /* Input Form: 2-Column Responsive Layout */
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column (8 cols): Form Fields */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* Personal Identity Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <User className="w-4 h-4 text-indigo-500" />
                      <span>Employee Identity & Credentials</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                          First Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="e.g. Siddharth"
                          required
                          className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500/30"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                          Last Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="e.g. Kapoor"
                          required
                          className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500/30"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Official Corporate Email <span className="text-rose-500">*</span></span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="siddharth.k@lexvera.com"
                        required
                        className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>
                  </div>

                  {/* Role & Organization Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-indigo-500" />
                      <span>Role & Departmental Structure</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                          System Role (RBAC Level)
                        </label>
                        <CustomSelect
                          value={role}
                          onChange={(val) => setRole(val)}
                          options={[
                            { value: 'EMPLOYEE', label: 'Employee (Standard Access)', sublabel: 'Standard operational permissions' },
                            { value: 'MANAGER', label: 'Manager (Team & Leave Approver)', sublabel: 'Team oversight and delegation' },
                            { value: 'HR_ADMIN', label: 'HR Admin (Full Operations)', sublabel: 'Company-wide HR & payroll controls' },
                            { value: 'ADMIN', label: 'Super Admin (Enterprise Root)', sublabel: 'Unrestricted system infrastructure' },
                          ]}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                          Job Designation <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          placeholder="e.g. Senior Cloud Architect"
                          required
                          className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500/30"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Department</span>
                        </label>
                        <CustomSelect
                          value={departmentId}
                          onChange={(val) => setDepartmentId(val)}
                          placeholder="Select department..."
                          options={dropdowns.departments.map((d: any) => ({
                            value: d.id,
                            label: d.name
                          }))}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Reporting Manager</span>
                        </label>
                        <CustomSelect
                          value={reportingManagerId}
                          onChange={(val) => setReportingManagerId(val)}
                          placeholder="None (Top-Level Executive)"
                          options={[
                            { value: '', label: 'None (Top-Level Executive)' },
                            ...dropdowns.managers.map((m: any) => ({
                              value: m.id,
                              label: m.name,
                              sublabel: m.designation || undefined
                            }))
                          ]}
                        />
                      </div>
                    </div>

                  </div>

                </div>

                {/* Right Column (4 cols): Onboarding Protocol Sidebar */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Automated Protocol Card */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-800">
                      Provisioning Protocol
                    </h4>

                    <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200 block">72-Hour Activation Window</strong>
                          <span>Secure single-use token generated for initial password setup.</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200 block">Attendance & Leave Ledger</strong>
                          <span>Default statutory leave balance automatically allocated upon onboarding.</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200 block">Hierarchy Linking</strong>
                          <span>Leaves and timesheets route to selected reporting manager for approvals.</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Corporate Compliance Note */}
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 p-6 space-y-3">
                    <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Security & Identity</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      All new accounts require email verification. For elevated roles (MANAGER, HR_ADMIN, ADMIN), multi-factor authorization will be enforced at initial sign-in.
                    </p>
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
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/30 transition transform active:scale-95 disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>{isSubmitting ? 'Generating Invite...' : 'Create & Issue Enterprise Invite'}</span>
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
};
