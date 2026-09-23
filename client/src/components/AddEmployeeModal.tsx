import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  X, UserPlus, Copy, Check, ArrowLeft, ChevronRight, ShieldCheck, Mail,
  Briefcase, User, Sparkles, Eye, EyeOff, AlertCircle, CheckCircle2,
  Loader2, KeyRound, RefreshCw, Send
} from 'lucide-react';
import { CustomSelect } from './CustomSelect';

const COMPANY_DOMAIN = '@nexus.com';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CreatedEmployeeData {
  id: string;
  name: string;
  employeeCode: string;
  email: string;
  officialEmail?: string;
  tempPassword: string;
  role: string;
  status: string;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { addToast } = useSocket();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailPrefix, setEmailPrefix] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [designation, setDesignation] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [reportingManagerId, setReportingManagerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email Uniqueness Verification State
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ available: boolean; message: string } | null>(null);
  const checkEmailTimer = useRef<any>(null);

  // Dropdown options
  const [dropdowns, setDropdowns] = useState<any>({
    departments: [],
    managers: []
  });

  // Success state: display generated credentials
  const [createdEmployee, setCreatedEmployee] = useState<CreatedEmployeeData | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchDropdowns();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmailPrefix('');
    setDesignation('');
    setRole('EMPLOYEE');
    setReportingManagerId('');
    setEmailStatus(null);
    setCreatedEmployee(null);
    setShowPassword(false);
    setCopiedField(null);
  };

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

  // Debounced live email check
  const handleEmailPrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    // Strip any typed @ and spaces
    const clean = rawVal.replace(/@.*$/, '').toLowerCase().replace(/[^a-z0-9._-]/g, '');
    setEmailPrefix(clean);

    if (checkEmailTimer.current) {
      clearTimeout(checkEmailTimer.current);
    }

    if (!clean.trim()) {
      setEmailStatus(null);
      setIsCheckingEmail(false);
      return;
    }

    setIsCheckingEmail(true);
    checkEmailTimer.current = setTimeout(async () => {
      try {
        const fullEmail = `${clean.trim()}${COMPANY_DOMAIN}`;
        const res = await api.get(`/employees/check-email?email=${encodeURIComponent(fullEmail)}`);
        if (res.data.exists) {
          setEmailStatus({
            available: false,
            message: `"${fullEmail}" is already in use by another colleague.`
          });
        } else {
          setEmailStatus({
            available: true,
            message: `"${fullEmail}" is available!`
          });
        }
      } catch (err) {
        setEmailStatus(null);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 350);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !emailPrefix.trim() || !designation.trim()) {
      addToast('Validation Error', 'First name, last name, email username, and designation are mandatory.', 'warning');
      return;
    }

    if (emailStatus && !emailStatus.available) {
      addToast('Validation Error', 'Please choose a unique email username.', 'danger');
      return;
    }

    const fullEmail = `${emailPrefix.trim().toLowerCase()}${COMPANY_DOMAIN}`;

    try {
      setIsSubmitting(true);
      const res = await api.post('/employees', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: fullEmail,
        role,
        designation: designation.trim(),
        departmentId: departmentId || undefined,
        reportingManagerId: reportingManagerId || undefined
      });

      if (res.data.success) {
        addToast('Employee Onboarded', `Credentials generated and dispatched for ${fullEmail}`, 'success');
        setCreatedEmployee(res.data.data);
        onSuccess();
      }
    } catch (err: any) {
      addToast('Onboarding Failed', err.response?.data?.message || 'Failed to create employee.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
    addToast('Copied', `${fieldName} copied to clipboard.`, 'info');
  };

  const copyAllCredentials = () => {
    if (!createdEmployee) return;
    const text = `NEXUS ENTERPRISE HRMS - EMPLOYEE CREDENTIALS\nName: ${createdEmployee.name}\nEmployee Code: ${createdEmployee.employeeCode}\nOfficial Email: ${createdEmployee.email}\nTemporary Password: ${createdEmployee.tempPassword}`;
    navigator.clipboard.writeText(text);
    setCopiedField('all');
    setTimeout(() => setCopiedField(null), 2000);
    addToast('Credentials Copied', 'All login details copied to clipboard.', 'success');
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
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition group cursor-pointer"
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
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Hero Welcome Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 p-8 text-white shadow-xl">
            <div className="relative z-10 flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
                <UserPlus className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Onboard New Employee</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Nexus Corporate Workspace
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-indigo-200/70 mt-1">
                  Provision new employee identity with automatic credential generation and instant email dispatch.
                </p>
              </div>
            </div>
          </div>

          {createdEmployee ? (
            /* ========================================================= */
            /* SUCCESS CREDENTIALS DOSSIER (Enterprise Presentation)    */
            /* ========================================================= */
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 shadow-xl max-w-2xl mx-auto text-center space-y-6 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                <Check className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Employee Account Activated!</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                  Account for <strong className="text-slate-800 dark:text-slate-100">{createdEmployee.name}</strong> is <strong className="text-emerald-600 dark:text-emerald-400">ACTIVE</strong>. Login credentials have been generated and dispatched to their email.
                </p>
              </div>

              {/* Credentials Card */}
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-left space-y-4 shadow-sm">
                
                {/* Email Item */}
                <div className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Login Email</span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white font-mono truncate select-all block">
                      {createdEmployee.email}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdEmployee.email, 'Email')}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer shrink-0"
                    title="Copy Email"
                  >
                    {copiedField === 'Email' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Employee Code Item */}
                <div className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Employee Code</span>
                    <span className="text-xs sm:text-sm font-semibold text-indigo-600 dark:text-indigo-400 font-mono select-all block">
                      {createdEmployee.employeeCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(createdEmployee.employeeCode, 'Employee Code')}
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer shrink-0"
                    title="Copy Employee Code"
                  >
                    {copiedField === 'Employee Code' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Item with Eye Toggle */}
                <div className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-indigo-200 dark:border-indigo-900/60 shadow-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 block">
                      Temporary Password (Generated)
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white font-mono select-all tracking-wider block">
                      {showPassword ? createdEmployee.tempPassword : '••••••••••••'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(createdEmployee.tempPassword, 'Password')}
                      className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer shadow-xs"
                      title="Copy Password"
                    >
                      {copiedField === 'Password' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

              </div>

              {/* Informational Email Dispatched Notice */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-800 dark:text-emerald-300 text-left flex items-start gap-2.5">
                <Send className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Credentials Dispatched:</strong> An official onboarding email containing these credentials and portal login instructions has been automatically dispatched to <strong>{createdEmployee.email}</strong>.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={copyAllCredentials}
                  className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedField === 'all' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedField === 'all' ? 'All Credentials Copied!' : 'Copy All Credentials'}</span>
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Onboard Another</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer"
                >
                  Return to Directory
                </button>
              </div>

            </div>
          ) : (
            /* ========================================================= */
            /* INPUT FORM: 2-Column Responsive Layout                   */
            /* ========================================================= */
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

                    {/* Official Corporate Email with Fixed Domain Suffix & Live Uniqueness */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Official Corporate Email <span className="text-rose-500">*</span></span>
                        </span>
                        <span className="text-[11px] font-normal text-slate-400 lowercase">
                          domain fixed as {COMPANY_DOMAIN}
                        </span>
                      </label>
                      
                      <div className={`relative flex rounded-xl border ${
                        emailStatus && !emailStatus.available
                          ? 'border-rose-400 dark:border-rose-600 bg-rose-50/30 dark:bg-rose-950/20'
                          : emailStatus?.available
                          ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                      } overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/30 transition`}>
                        <div className="pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={emailPrefix}
                          onChange={handleEmailPrefixChange}
                          placeholder="username (e.g. siddharth.k)"
                          required
                          className="w-full pl-2.5 pr-2 py-2.5 text-xs bg-transparent text-slate-800 dark:text-slate-100 font-medium focus:outline-none"
                        />
                        <div className="px-3.5 py-2.5 bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold select-none flex items-center border-l border-slate-200 dark:border-slate-600 tracking-tight">
                          {COMPANY_DOMAIN}
                        </div>
                      </div>

                      {/* Live Feedback Indicator */}
                      <div className="mt-1.5 min-h-[18px] text-[11px] flex items-center gap-1.5">
                        {isCheckingEmail && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                            <span>Checking availability in directory...</span>
                          </div>
                        )}
                        {!isCheckingEmail && emailStatus && (
                          emailStatus.available ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              {emailStatus.message}
                            </span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                              {emailStatus.message}
                            </span>
                          )
                        )}
                        {!isCheckingEmail && !emailStatus && (
                          <span className="text-slate-400 text-[10px]">
                            Enter colleague's unique prefix (e.g. first.last). The system will automatically construct the full address.
                          </span>
                        )}
                      </div>
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
                          onChange={setRole}
                          options={[
                            { value: 'EMPLOYEE', label: 'Employee (Standard Access)' },
                            { value: 'MANAGER', label: 'Manager (Team Approvals & Roster)' },
                            { value: 'HR_ADMIN', label: 'HR Admin (People & Leaves Ops)' },
                            { value: 'ADMIN', label: 'Super Admin (Unrestricted System Access)' }
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
                          placeholder="e.g. Lead Full-Stack Architect"
                          required
                          className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500/30"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                          Department
                        </label>
                        <CustomSelect
                          value={departmentId}
                          onChange={setDepartmentId}
                          options={dropdowns.departments?.map((d: any) => ({
                            value: d.id,
                            label: d.name
                          })) || []}
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                          Reporting Manager
                        </label>
                        <CustomSelect
                          value={reportingManagerId}
                          onChange={setReportingManagerId}
                          options={[
                            { value: '', label: 'None (Top-Level Executive)' },
                            ...(dropdowns.managers?.map((m: any) => ({
                              value: m.id,
                              label: `${m.firstName} ${m.lastName} (${m.role})`
                            })) || [])
                          ]}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Form Action Buttons */}
                  <div className="flex items-center justify-between pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      Cancel & Return
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting || (emailStatus ? !emailStatus.available : false)}
                      className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-xs font-bold text-white transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating Credentials...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="w-4 h-4" />
                          <span>Create & Issue Enterprise Credentials</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>

                {/* Right Column (4 cols): Information & Protocol Details */}
                <div className="lg:col-span-4 space-y-6">
                  
                  {/* Provisioning Protocol */}
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-500" />
                      <span>Provisioning Protocol</span>
                    </h3>

                    <ul className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400">
                      <li className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3" />
                        </div>
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200 block">Instant Activation</strong>
                          Auto-generated cryptographically secure temporary password and active status.
                        </div>
                      </li>

                      <li className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3" />
                        </div>
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200 block">Automatic Email Dispatch</strong>
                          Credentials are dispatched to the employee's inbox upon provisioning.
                        </div>
                      </li>

                      <li className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3" />
                        </div>
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200 block">Statutory Leave Ledger</strong>
                          Standard statutory leave balances automatically mapped upon account creation.
                        </div>
                      </li>

                      <li className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3" />
                        </div>
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200 block">Hierarchy Linking</strong>
                          Leaves and timesheets automatically route to selected reporting manager for approvals.
                        </div>
                      </li>
                    </ul>
                  </div>

                  {/* Security Policy */}
                  <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/50 text-xs text-indigo-900 dark:text-indigo-300 space-y-2">
                    <strong className="flex items-center gap-1.5 font-bold">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Security & Identity Control</span>
                    </strong>
                    <p className="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 leading-relaxed">
                      For security compliance, the employee will be prompted to change their temporary password upon their first sign-in.
                    </p>
                  </div>

                </div>

              </div>
            </form>
          )}

        </div>
      </main>

    </div>,
    document.body
  );
};
