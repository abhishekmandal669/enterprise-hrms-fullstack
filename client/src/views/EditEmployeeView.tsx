import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Sparkles,
  Building2,
  Mail,
  Phone,
  User,
  KeyRound,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';

export const EditEmployeeView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useSocket();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Employee Profile State
  const [employeeCode, setEmployeeCode] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [designation, setDesignation] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [departmentId, setDepartmentId] = useState('');
  const [reportingManagerId, setReportingManagerId] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [joiningDate, setJoiningDate] = useState('');

  // Password Reset State
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  // Dropdowns
  const [dropdowns, setDropdowns] = useState<{
    departments: any[];
    managers: any[];
  }>({
    departments: [],
    managers: []
  });

  useEffect(() => {
    if (id) {
      loadEmployeeAndDropdowns(id);
    }
  }, [id]);

  const loadEmployeeAndDropdowns = async (empId: string) => {
    try {
      setLoading(true);
      setErrorMessage(null);

      // Parallel fetch employee 360 data and dropdowns
      const [empRes, dropRes] = await Promise.all([
        api.get(`/admin/employees/${empId}/360`),
        api.get('/master/dropdowns').catch(() => ({ data: { success: false, data: null } }))
      ]);

      if (empRes.data.success) {
        const emp = empRes.data.data.profile;
        setEmployeeCode(emp.employeeCode || '');
        setOfficialEmail(emp.email || emp.officialEmail || '');
        setFirstName(emp.firstName || '');
        setLastName(emp.lastName || '');
        setDesignation(emp.designation || '');
        setRole(emp.role || 'EMPLOYEE');
        setDepartmentId(emp.departmentId || emp.department?.id || '');
        setReportingManagerId(emp.reportingManagerId || emp.reportingManager?.id || '');
        setPhone(emp.phone || '');
        setStatus(emp.status || 'ACTIVE');
        setAvatarUrl(emp.avatarUrl || null);
        setJoiningDate(emp.joiningDate || (emp.createdAt ? emp.createdAt.split('T')[0] : ''));
      } else {
        setErrorMessage('Failed to load employee details.');
      }

      if (dropRes.data?.success && dropRes.data?.data) {
        setDropdowns({
          departments: dropRes.data.data.departments || [],
          managers: dropRes.data.data.managers || []
        });
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Error loading employee information.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Photo File Upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      addToast('File Too Large', 'Please select an image smaller than 5MB.', 'warning');
      return;
    }

    try {
      setUploadingAvatar(true);
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await api.post(`/employees/${id}/avatar`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success && res.data.data.avatarUrl) {
        setAvatarUrl(res.data.data.avatarUrl);
        addToast('Photo Uploaded', 'Employee profile picture updated successfully!', 'success');
      }
    } catch (err: any) {
      console.error(err);
      addToast('Upload Failed', err.response?.data?.message || 'Failed to upload photo.', 'danger');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove Photo
  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    addToast('Photo Removed', 'Remember to save changes to apply removal.', 'info');
  };

  // Random Password Generator
  const generateRandomPassword = () => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '@#$%&*!';
    const all = upper + lower + numbers + symbols;

    let pwd =
      upper[Math.floor(Math.random() * upper.length)] +
      lower[Math.floor(Math.random() * lower.length)] +
      numbers[Math.floor(Math.random() * numbers.length)] +
      symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < 10; i++) {
      pwd += all[Math.floor(Math.random() * all.length)];
    }

    const generated = pwd.split('').sort(() => 0.5 - Math.random()).join('');
    setNewPassword(generated);
    setShowPassword(true);
    addToast('Password Generated', 'New 10-character strong temporary password generated.', 'info');
  };

  const handleCopyPassword = () => {
    if (newPassword) {
      navigator.clipboard.writeText(newPassword);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 2000);
      addToast('Copied', 'New password copied to clipboard.', 'info');
    }
  };

  // Submit Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!firstName.trim() || !lastName.trim() || !designation.trim()) {
      setErrorMessage('First Name, Last Name, and Job Designation are required.');
      addToast('Validation Error', 'Please fill in all required fields.', 'warning');
      return;
    }

    if (newPassword && newPassword.trim().length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      addToast('Validation Error', 'Password too short.', 'warning');
      return;
    }

    try {
      setSaving(true);

      const payload: any = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        designation: designation.trim(),
        role,
        departmentId: departmentId || undefined,
        reportingManagerId: reportingManagerId || undefined,
        phone: phone.trim() || undefined,
        status,
        avatarUrl: avatarUrl || null
      };

      if (newPassword.trim()) {
        payload.password = newPassword.trim();
      }

      const res = await api.put(`/employees/${id}`, payload);

      if (res.data.success) {
        addToast(
          'Profile Saved',
          newPassword.trim()
            ? 'Employee profile and new password updated successfully!'
            : 'Employee profile updated successfully!',
          'success'
        );
        // Navigate back to the 360 dossier or employee list
        navigate(`/employees/${id}`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Failed to update employee profile.');
      addToast('Save Failed', err.response?.data?.message || 'Server error occurred.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
          Loading employee profile & permissions...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 pt-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(id ? `/employees/${id}` : '/employees')}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:hover:border-indigo-700 transition shadow-xs flex items-center justify-center"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-0.5">
              <Link to="/employees" className="hover:text-indigo-600 transition">Employees</Link>
              <span>/</span>
              <Link to={`/employees/${id}`} className="hover:text-indigo-600 transition">Profile Dossier</Link>
              <span>/</span>
              <span className="text-slate-700 dark:text-slate-200">Edit Profile & Credentials</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <span>Edit {firstName} {lastName}</span>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-bold">
                {employeeCode}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate(id ? `/employees/${id}` : '/employees')}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Save Profile & Credentials</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Alert if any */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-sm flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">

        {/* 1. Hero Avatar & Image Upload Section */}
        <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            
            {/* Avatar Preview */}
            <div className="relative group shrink-0">
              <div className="w-28 h-28 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-400 p-1 shadow-xl">
                <div className="w-full h-full rounded-[14px] bg-slate-900 overflow-hidden flex items-center justify-center text-white font-black text-3xl">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl.startsWith('/') ? `${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}${avatarUrl}` : avatarUrl}
                      alt={firstName}
                      className="w-full h-full object-cover"
                      onError={() => {
                        // Fallback on broken image
                        setAvatarUrl(null);
                      }}
                    />
                  ) : (
                    <span>{firstName?.[0] || 'U'}{lastName?.[0] || 'E'}</span>
                  )}
                </div>
              </div>

              {/* Uploading Spinner Overlay */}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <span className="text-[10px] font-bold mt-1">Uploading...</span>
                </div>
              )}
            </div>

            {/* Photo Actions */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Profile Photo</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                  JPG, PNG, WEBP (Max 5MB)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This image will appear across the Directory, Organization Chart, Profile Dossier, and Header navigation.
              </p>

              <div className="pt-2 flex items-center justify-center sm:justify-start flex-wrap gap-2.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarFileChange}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  id="avatar-file-input"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200 dark:border-indigo-800/80 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Upload New Photo</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>

              {/* Direct Image URL input option */}
              <div className="pt-3 max-w-md">
                <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mb-1">
                  <span>Or enter custom Image URL</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={avatarUrl || ''}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrl(null)}
                      className="text-xs text-slate-400 hover:text-rose-500 font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* 2. Personal Information Section */}
        <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <User className="w-4 h-4 text-indigo-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Personal Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Arjun"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Sharma"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Official Work Email</span>
                <span className="text-[10px] text-slate-400 font-normal">Immutable</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={officialEmail}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed font-mono"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Contact Phone
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition font-medium"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>
          </div>
        </div>

        {/* 3. Organizational Structure & Roles */}
        <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Building2 className="w-4 h-4 text-indigo-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Role & Organization</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Job Designation <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Lead Frontend Engineer"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                System Role (RBAC) <span className="text-rose-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition font-medium"
              >
                <option value="EMPLOYEE">Employee (Standard Access)</option>
                <option value="MANAGER">Manager (Team Approval & Logs)</option>
                <option value="HR_ADMIN">HR Administrator (People Operations)</option>
                <option value="ADMIN">Super Administrator (Full System Authority)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Department
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition font-medium"
              >
                <option value="">Select Department...</option>
                {dropdowns.departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Reporting Manager
              </label>
              <select
                value={reportingManagerId}
                onChange={(e) => setReportingManagerId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition font-medium"
              >
                <option value="">None (Top-Level Executive / Board)</option>
                {dropdowns.managers
                  .filter((m) => m.id !== id)
                  .map((mgr) => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.firstName} {mgr.lastName} &bull; {mgr.designation} ({mgr.role})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Account Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition font-medium"
              >
                <option value="ACTIVE">Active</option>
                <option value="PROBATION">Probation</option>
                <option value="SUSPENDED">Suspended (Login Blocked)</option>
                <option value="INVITED">Invited (Activation Pending)</option>
                <option value="TERMINATED">Terminated</option>
                <option value="EXITED">Exited</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Date of Joining</span>
                <span className="text-[10px] text-slate-400 font-normal">Official Record</span>
              </label>
              <input
                type="text"
                disabled
                value={joiningDate || '2026-09-23'}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-400 cursor-not-allowed font-medium"
              />
            </div>
          </div>
        </div>

        {/* 4. Password Change / Reset Section */}
        <div className="p-6 md:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Change / Reset Password
              </h2>
            </div>

            <button
              type="button"
              onClick={generateRandomPassword}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Generate Strong Password</span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              New Password <span className="text-slate-400 font-normal">(Leave blank to keep existing password)</span>
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 6 characters)"
                className="w-full pl-3.5 pr-20 py-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white focus:outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition font-mono"
              />

              <div className="absolute right-2.5 top-2 flex items-center gap-1">
                {newPassword && (
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                    title="Copy Password"
                  >
                    {passwordCopied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Entering a new password here will immediately overwrite the employee's existing credentials in the database upon saving.
            </p>
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => navigate(id ? `/employees/${id}` : '/employees')}
            className="px-5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-lg shadow-indigo-600/25 transition flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Profile & Credentials</span>
              </>
            )}
          </button>
        </div>

      </form>

    </div>
  );
};
