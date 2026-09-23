import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import {
  X, UserCog, Lock, Eye, EyeOff, Sparkles, Check, AlertCircle,
  Loader2
} from 'lucide-react';
import { CustomSelect } from './CustomSelect';

interface EditEmployeeModalProps {
  isOpen: boolean;
  employee: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  isOpen,
  employee,
  onClose,
  onSuccess
}) => {
  const { addToast } = useSocket();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [designation, setDesignation] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [departmentId, setDepartmentId] = useState('');
  const [reportingManagerId, setReportingManagerId] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('ACTIVE');

  // Password Reset fields
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dropdowns
  const [dropdowns, setDropdowns] = useState<any>({
    departments: [],
    managers: []
  });

  useEffect(() => {
    if (isOpen && employee) {
      setFirstName(employee.firstName || '');
      setLastName(employee.lastName || '');
      setDesignation(employee.designation || '');
      setRole(employee.role || 'EMPLOYEE');
      setDepartmentId(employee.departmentId || employee.department?.id || '');
      setReportingManagerId(employee.reportingManagerId || employee.reportingManager?.id || '');
      setPhone(employee.phone || '');
      setStatus(employee.status || 'ACTIVE');
      setNewPassword('');
      setShowPassword(false);
      setErrorMessage(null);
      fetchDropdowns();
    }
  }, [isOpen, employee]);

  const fetchDropdowns = async () => {
    try {
      const res = await api.get('/master/dropdowns');
      if (res.data.success) {
        setDropdowns(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load dropdowns', err);
    }
  };

  const generateRandomPassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '@#$%&*!';
    const all = upper + lower + numbers + symbols;

    let pwd = upper[Math.floor(Math.random() * upper.length)] +
              lower[Math.floor(Math.random() * lower.length)] +
              numbers[Math.floor(Math.random() * numbers.length)] +
              symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < 10; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }

    const generated = pwd.split('').sort(() => 0.5 - Math.random()).join('');
    setNewPassword(generated);
    setShowPassword(true);
    addToast('Password Generated', 'New temporary password generated.', 'info');
  };

  const handleCopyPassword = () => {
    if (newPassword) {
      navigator.clipboard.writeText(newPassword);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
      addToast('Copied', 'New password copied to clipboard.', 'info');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!firstName.trim() || !lastName.trim() || !designation.trim()) {
      setErrorMessage('First name, last name, and designation cannot be empty.');
      addToast('Validation Error', 'Required fields are missing.', 'warning');
      return;
    }

    if (newPassword && newPassword.trim().length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      addToast('Validation Error', 'Password too short.', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        designation: designation.trim(),
        role,
        departmentId: departmentId || undefined,
        reportingManagerId: reportingManagerId || undefined,
        phone: phone.trim() || undefined,
        status
      };

      if (newPassword.trim()) {
        payload.password = newPassword.trim();
      }

      const res = await api.put(`/employees/${employee.id}`, payload);
      if (res.data.success) {
        addToast(
          'Profile Updated',
          newPassword.trim()
            ? `Employee details and password updated for ${employee.firstName}.`
            : `Employee details updated for ${employee.firstName}.`,
          'success'
        );
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update employee details.';
      setErrorMessage(msg);
      addToast('Update Failed', msg, 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !employee) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 my-8 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Edit Employee & Credentials</span>
                <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 font-semibold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60">
                  {employee.employeeCode}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Update organizational role, job designation, status, and reset employee password.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Identity & Contact */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Personal Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  First Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Last Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Email (Read-Only)
                </label>
                <input
                  type="text"
                  value={employee.email}
                  disabled
                  className="w-full px-3.5 py-2 text-xs bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl text-slate-500 dark:text-slate-400 font-mono cursor-not-allowed select-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>
            </div>
          </div>

          {/* Role, Department & Status */}
          <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Role & Organizational Structure
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Job Designation <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-medium focus:ring-2 focus:ring-indigo-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  System Role (RBAC)
                </label>
                <CustomSelect
                  value={role}
                  onChange={setRole}
                  options={[
                    { value: 'EMPLOYEE', label: 'Employee (Standard Access)' },
                    { value: 'MANAGER', label: 'Department Manager (Approver)' },
                    { value: 'HR_ADMIN', label: 'HR Administrator' },
                    { value: 'ADMIN', label: 'Super Administrator' }
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
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
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reporting Manager
                </label>
                <CustomSelect
                  value={reportingManagerId}
                  onChange={setReportingManagerId}
                  options={[
                    { value: '', label: 'None (Top-Level Executive)' },
                    ...(dropdowns.managers?.filter((m: any) => m.id !== employee.id).map((m: any) => ({
                      value: m.id,
                      label: `${m.firstName} ${m.lastName} (${m.role})`
                    })) || [])
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Status
                </label>
                <CustomSelect
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'PROBATION', label: 'Probation' },
                    { value: 'SUSPENDED', label: 'Suspended' },
                    { value: 'RESIGNED', label: 'Resigned' },
                    { value: 'EXITED', label: 'Exited' },
                    { value: 'TERMINATED', label: 'Terminated' }
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Password Change / Reset Section */}
          <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Change / Reset Password
                </span>
              </div>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3 h-3 text-indigo-500" />
                <span>Generate Strong Password</span>
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep existing password"
                className="w-full pl-3.5 pr-20 py-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 font-mono focus:ring-2 focus:ring-indigo-500/30"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {newPassword && (
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                    title="Copy Password"
                  >
                    {passwordCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Lock className="w-4 h-4" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Entering a new password here will immediately overwrite the employee's existing password in the database.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition shadow-md shadow-indigo-600/30 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Profile & Credentials'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>,
    document.body
  );
};
