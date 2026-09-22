import React, { useState, useEffect } from 'react';
import {
  Building2,
  HeartHandshake,
  Save,
  Loader2,
  Calendar,
  User,
  Users,
  ShieldCheck,
  Clock,
  Mail,
  Phone,
  MapPin,
  Sparkles,
  KeyRound,
  Copy,
  Check
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { formatShiftWindow } from '../utils/timeUtils';

export const EmployeeProfileView: React.FC = () => {
  const { addToast } = useSocket();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable Form State
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [copiedOfficialEmail, setCopiedOfficialEmail] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employees/profile/me');
      if (res.data.success) {
        const data = res.data.data;
        setProfile(data);
        setPhone(data.phone || '');
        setDateOfBirth(data.dateOfBirth || '');
        setAddress(data.address || '');
        setEmergencyContactName(data.emergencyContactName || '');
        setEmergencyContactPhone(data.emergencyContactPhone || '');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put('/employees/profile/me', {
        phone,
        dateOfBirth,
        address,
        emergencyContactName,
        emergencyContactPhone
      });
      if (res.data.success) {
        addToast('Profile Updated', 'Your personal, date of birth and emergency contact details have been saved.', 'success');
        setProfile((prev: any) => ({
          ...prev,
          ...res.data.data
        }));
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to update profile.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600 mb-2" />
        <span>Loading full employee profile & team hierarchy...</span>
      </div>
    );
  }

  const completionPercent = profile?.profileCompleted ? 100 : 80;
  const reportingManager = profile?.reportingManager;
  const teamMembers = profile?.teamMembers || [];
  const reportees = profile?.reportees || [];
  const permissions = profile?.permissions || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      
      {/* 1. Header Hero Profile Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="relative">
          <img
            src={profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
            alt="Avatar"
            className="w-24 h-24 rounded-3xl object-cover ring-4 ring-indigo-50 dark:ring-indigo-950/60 shadow-md"
          />
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" title="Active Account" />
        </div>

        <div className="flex-1 text-center md:text-left space-y-3 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {profile?.firstName} {profile?.lastName}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {profile?.employeeCode || 'LEX-101'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {profile?.designation || 'Staff Member'} &bull; {profile?.department?.name || 'Engineering & Product'}
              </p>
            </div>

            <div className="flex items-center justify-center sm:justify-end gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Role: {profile?.role}
              </span>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                {profile?.status || 'ACTIVE'}
              </span>
            </div>
          </div>

          {/* Profile Completeness Strip */}
          <div className="pt-2 space-y-1">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-500">Profile Completeness</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">{completionPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Employment & Service Dates Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Date of Joining</span>
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-1 font-mono">
            {profile?.joiningDate || '2026-01-15'}
          </div>
          <span className="text-[11px] text-slate-400">Regular payroll start</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Date of Birth</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-1 font-mono">
            {profile?.dateOfBirth || (dateOfBirth ? dateOfBirth : 'Not specified')}
          </div>
          <span className="text-[11px] text-slate-400">Official HR records</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Access Role</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
            {profile?.role === 'ADMIN' ? 'Org Administrator' : profile?.role === 'MANAGER' ? 'Reporting Manager' : 'Individual Staff'}
          </div>
          <span className="text-[11px] text-slate-400">RBAC Scoped Tier</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Shift Window</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white mt-1 font-mono">
            {formatShiftWindow(profile?.shiftStartTime, profile?.shiftEndTime)}
          </div>
          <span className="text-[11px] text-slate-400">15m grace window</span>
        </div>
      </div>

      {/* 3. Main Grid: Corporate Deployment & Hierarchy vs Personal Contacts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column: Corporate Deployment & Manager Hierarchy */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-sm">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <span>Corporate Deployment & Governance</span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400">Employee Code</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{profile?.employeeCode}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400">Official Company Email</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 text-[11px] bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                    <Mail className="w-3.5 h-3.5 text-indigo-500" />
                    {profile?.officialEmail || `${profile?.email?.split('@')[0]}@lexvera.internal`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const mail = profile?.officialEmail || `${profile?.email?.split('@')[0]}@lexvera.internal`;
                      navigator.clipboard.writeText(mail);
                      setCopiedOfficialEmail(true);
                      setTimeout(() => setCopiedOfficialEmail(false), 2000);
                    }}
                    title="Copy Official Work Email"
                    className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition p-1"
                  >
                    {copiedOfficialEmail ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400">Personal / Account Email</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {profile?.email}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400">Department</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{profile?.department?.name || 'General Operations'}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400">Office Campus</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  Lexvera Global HQ (Main Campus)
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400">Employment Contract</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Full-Time Permanent</span>
              </div>
            </div>
          </div>

          {/* Reporting Manager & Team Lead Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <User className="w-4 h-4 text-indigo-500" />
                <span>Reporting Manager & Team Lead</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                Direct Lead
              </span>
            </div>

            {reportingManager ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold flex items-center justify-center text-base shadow-sm shrink-0">
                  {reportingManager.avatarUrl ? (
                    <img src={reportingManager.avatarUrl} alt="" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    <span>{reportingManager.firstName?.[0]}{reportingManager.lastName?.[0]}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-bold text-slate-900 dark:text-white">
                      {reportingManager.firstName} {reportingManager.lastName}
                    </strong>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      {reportingManager.role}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">
                    {reportingManager.designation || 'Engineering Lead / Manager'}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {reportingManager.email}
                    </span>
                    {reportingManager.employeeCode && (
                      <span className="font-mono">{reportingManager.employeeCode}</span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                Reports directly to Executive Leadership / Board of Directors.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Personal & Emergency Info Form */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-bold text-sm">
              <HeartHandshake className="w-4 h-4 text-rose-500" />
              <span>Personal, Contact & Emergency Details</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                    Personal Phone
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                  Residential Address
                </label>
                <div className="relative">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    rows={2}
                    placeholder="Residential address, City, State, PIN"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block mb-2 uppercase tracking-wide">
                  Emergency Contact Channel
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                      Emergency Contact Name
                    </label>
                    <input
                      type="text"
                      placeholder="Parent / Spouse / Guardian Name"
                      value={emergencyContactName}
                      onChange={(e) => setEmergencyContactName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                      Emergency Contact Phone
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        placeholder="+91 98765 00000"
                        value={emergencyContactPhone}
                        onChange={(e) => setEmergencyContactPhone(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Records...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Profile Details</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Access Role & Permissions Badge List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
                <KeyRound className="w-4 h-4 text-indigo-500" />
                <span>Granted Access Privileges & Capabilities</span>
              </div>
              <span className="text-[10px] text-slate-400 font-semibold">{permissions.length} Permissions</span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {(permissions.length > 0 ? permissions : [
                'attendance.punch', 'leave.apply', 'tasks.self', 'timesheets.log', 'broadcasts.read', 'profile.edit'
              ]).map((perm: string) => (
                <span
                  key={perm}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                >
                  {perm}
                </span>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* 4. Team Members & Peers (Who Else is on the Team) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <Users className="w-4 h-4 text-indigo-500" />
            <span>
              {profile?.role === 'MANAGER' ? 'Direct Reportees & Team Deliverables' : 'Department Colleagues & Team Peers'}
            </span>
          </div>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
            {profile?.role === 'MANAGER' ? `${reportees.length} Team Members` : `${teamMembers.length} Colleagues`}
          </span>
        </div>

        {(profile?.role === 'MANAGER' ? reportees : teamMembers).length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400">
            No colleagues or reportees assigned in the team roster yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {(profile?.role === 'MANAGER' ? reportees : teamMembers).map((member: any) => (
              <div
                key={member.id}
                className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl flex items-center gap-3 hover:border-indigo-300 dark:hover:border-indigo-700 transition"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <span>{member.firstName?.[0]}{member.lastName?.[0]}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {member.firstName} {member.lastName}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {member.designation || 'Staff Member'}
                  </div>
                  <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                    {member.employeeCode}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
