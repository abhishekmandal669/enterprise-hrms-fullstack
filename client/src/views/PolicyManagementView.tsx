import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock,
  Calendar,
  MapPin,
  Plus,
  Trash2,
  Loader2,
  Save,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { PaginationControls } from '../components/PaginationControls';

export const PolicyManagementView: React.FC = () => {
  const { addToast } = useSocket();
  const [activeSubTab, setActiveSubTab] = useState<'SHIFTS' | 'HOLIDAYS' | 'GEOFENCE' | 'RBAC_PERMISSIONS'>('SHIFTS');

  // Pagination states (10, 25, 50, 100)
  const [shiftPage, setShiftPage] = useState(1);
  const [shiftPageSize, setShiftPageSize] = useState(10);
  const [holidayPage, setHolidayPage] = useState(1);
  const [holidayPageSize, setHolidayPageSize] = useState(10);

  // Shifts state
  const [shifts, setShifts] = useState<any[]>([]);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [newShift, setNewShift] = useState({
    name: '',
    code: '',
    startTime: '09:00',
    endTime: '18:00',
    graceMinutes: 15,
    breakMinutes: 60,
    isActive: true
  });
  const [savingShift, setSavingShift] = useState(false);

  // Holidays state
  const [holidays, setHolidays] = useState<any[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [isAddHolidayOpen, setIsAddHolidayOpen] = useState(false);
  const [newHoliday, setNewHoliday] = useState({
    date: new Date().toISOString().split('T')[0],
    name: '',
    description: '',
    isOptional: false
  });
  const [savingHoliday, setSavingHoliday] = useState(false);

  // Geofence state
  const [geofence, setGeofence] = useState({
    officeLatitude: 28.4595,
    officeLongitude: 77.0266,
    allowedRadiusMeters: 250,
    isEnforced: false
  });
  const [savingGeofence, setSavingGeofence] = useState(false);

  // RBAC Matrix States
  const [roles, setRoles] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [rolePermissionsMap, setRolePermissionsMap] = useState<Record<string, string[]>>({});
  const [loadingRbac, setLoadingRbac] = useState(false);
  const [savingRbac, setSavingRbac] = useState(false);

  const fetchRbac = async () => {
    try {
      setLoadingRbac(true);
      const [rolesRes, permsRes] = await Promise.all([
        api.get('/roles'),
        api.get('/roles/permissions')
      ]);
      if (rolesRes.data.success && permsRes.data.success) {
        setRoles(rolesRes.data.data);
        setAllPermissions(permsRes.data.data);
        const map: Record<string, string[]> = {};
        rolesRes.data.data.forEach((r: any) => {
          map[r.id] = r.permissions || [];
        });
        setRolePermissionsMap(map);
        if (rolesRes.data.data.length > 0 && !selectedRoleId) {
          setSelectedRoleId(rolesRes.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching RBAC:', err);
    } finally {
      setLoadingRbac(false);
    }
  };

  const togglePermissionForSelectedRole = (permKey: string) => {
    if (!selectedRoleId) return;
    const current = rolePermissionsMap[selectedRoleId] || [];
    const exists = current.includes(permKey);
    const updated = exists ? current.filter(k => k !== permKey) : [...current, permKey];
    setRolePermissionsMap({
      ...rolePermissionsMap,
      [selectedRoleId]: updated
    });
  };

  const handleSaveRolePermissions = async () => {
    if (!selectedRoleId) return;
    try {
      setSavingRbac(true);
      const currentPerms = rolePermissionsMap[selectedRoleId] || [];
      const res = await api.put(`/roles/${selectedRoleId}/permissions`, {
        permissionKeys: currentPerms
      });
      if (res.data.success) {
        addToast('Permissions Updated', 'Role permissions saved successfully.', 'success');
        fetchRbac();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to save permissions.', 'danger');
    } finally {
      setSavingRbac(false);
    }
  };

  // Fetch shifts
  const fetchShifts = async () => {
    try {
      setLoadingShifts(true);
      const res = await api.get('/policies/shifts');
      if (res.data.success) {
        setShifts(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingShifts(false);
    }
  };

  // Fetch holidays
  const fetchHolidays = async () => {
    try {
      setLoadingHolidays(true);
      const res = await api.get('/holidays');
      if (res.data.success) {
        setHolidays(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingHolidays(false);
    }
  };

  // Fetch geofence
  const fetchGeofence = async () => {
    try {
      const res = await api.get('/policies/geofence');
      if (res.data.success) {
        setGeofence(res.data.data);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'SHIFTS') fetchShifts();
    if (activeSubTab === 'HOLIDAYS') fetchHolidays();
    if (activeSubTab === 'GEOFENCE') fetchGeofence();
    if (activeSubTab === 'RBAC_PERMISSIONS') fetchRbac();
  }, [activeSubTab]);

  // Handle Add Shift
  const handleAddShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShift.name || !newShift.code) return;
    try {
      setSavingShift(true);
      const res = await api.post('/policies/shifts', newShift);
      if (res.data.success) {
        addToast('Shift Created', `Shift ${newShift.name} added successfully.`, 'success');
        setIsAddShiftOpen(false);
        setNewShift({
          name: '',
          code: '',
          startTime: '09:00',
          endTime: '18:00',
          graceMinutes: 15,
          breakMinutes: 60,
          isActive: true
        });
        fetchShifts();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to create shift.', 'danger');
    } finally {
      setSavingShift(false);
    }
  };

  const [deleteShiftId, setDeleteShiftId] = useState<string | null>(null);
  const [deleteHolidayId, setDeleteHolidayId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle Delete Shift
  const handleDeleteShift = (id: string) => {
    setDeleteShiftId(id);
  };

  const executeDeleteShift = async () => {
    if (!deleteShiftId) return;
    try {
      setIsDeleting(true);
      await api.delete(`/policies/shifts/${deleteShiftId}`);
      addToast('Shift Deleted', 'Shift configuration removed.', 'info');
      setDeleteShiftId(null);
      fetchShifts();
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to delete shift.', 'danger');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Add Holiday
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHoliday.name || !newHoliday.date) return;
    try {
      setSavingHoliday(true);
      const res = await api.post('/holidays', newHoliday);
      if (res.data.success) {
        addToast('Holiday Added', `${newHoliday.name} added to calendar.`, 'success');
        setIsAddHolidayOpen(false);
        setNewHoliday({
          date: new Date().toISOString().split('T')[0],
          name: '',
          description: '',
          isOptional: false
        });
        fetchHolidays();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to add holiday.', 'danger');
    } finally {
      setSavingHoliday(false);
    }
  };

  // Handle Delete Holiday
  const handleDeleteHoliday = (id: string) => {
    setDeleteHolidayId(id);
  };

  const executeDeleteHoliday = async () => {
    if (!deleteHolidayId) return;
    try {
      setIsDeleting(true);
      await api.delete(`/holidays/${deleteHolidayId}`);
      addToast('Holiday Removed', 'Holiday deleted from calendar.', 'info');
      setDeleteHolidayId(null);
      fetchHolidays();
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to remove holiday.', 'danger');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Save Geofence
  const handleSaveGeofence = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingGeofence(true);
      const res = await api.put('/policies/geofence', geofence);
      if (res.data.success) {
        addToast('Geofence Saved', 'Office perimeter and GPS validation updated.', 'success');
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to update geofence.', 'danger');
    } finally {
      setSavingGeofence(false);
    }
  };

  const paginatedShifts = shifts.slice(
    (shiftPage - 1) * shiftPageSize,
    shiftPage * shiftPageSize
  );

  const paginatedHolidays = holidays.slice(
    (holidayPage - 1) * holidayPageSize,
    holidayPage * holidayPageSize
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>Corporate Policies & Shift Governance</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Admin Governance
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure work shifts, corporate holiday calendar, and GPS geofence rules.
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
          <button
            onClick={() => setActiveSubTab('SHIFTS')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeSubTab === 'SHIFTS'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Work Shifts</span>
          </button>

          <button
            onClick={() => setActiveSubTab('HOLIDAYS')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeSubTab === 'HOLIDAYS'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Holiday Calendar</span>
          </button>

          <button
            onClick={() => setActiveSubTab('GEOFENCE')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeSubTab === 'GEOFENCE'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Geofence Rules</span>
          </button>

          <button
            onClick={() => setActiveSubTab('RBAC_PERMISSIONS')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeSubTab === 'RBAC_PERMISSIONS'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>RBAC Matrix</span>
          </button>
        </div>
      </div>

      {/* 1. SHIFTS TAB */}
      {activeSubTab === 'SHIFTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Configured Shifts ({shifts.length})
            </span>
            <button
              onClick={() => setIsAddShiftOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Shift</span>
            </button>
          </div>

          {loadingShifts ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading shifts...</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedShifts.map(s => (
                  <div
                    key={s.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{s.name}</h4>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          {s.code}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteShift(s.id)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                        title="Delete Shift"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Timings</span>
                        <strong className="text-slate-800 dark:text-slate-200 font-mono-num">
                          {s.startTime} - {s.endTime}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Grace Window</span>
                        <strong className="text-amber-600 dark:text-amber-400 font-mono-num">
                          {s.graceMinutes} mins
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <PaginationControls
                  currentPage={shiftPage}
                  pageSize={shiftPageSize}
                  totalEntries={shifts.length}
                  pageSizeOptions={[10, 25, 50, 100]}
                  onPageChange={setShiftPage}
                  onPageSizeChange={(newSize) => {
                    setShiftPageSize(newSize);
                    setShiftPage(1);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. HOLIDAY CALENDAR TAB */}
      {activeSubTab === 'HOLIDAYS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">
              Corporate Holidays ({holidays.length})
            </span>
            <button
              onClick={() => setIsAddHolidayOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Holiday</span>
            </button>
          </div>

          {loadingHolidays ? (
            <div className="p-12 text-center text-xs text-slate-400">Loading holiday calendar...</div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Holiday Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedHolidays.map(h => (
                      <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-mono-num font-bold text-slate-800 dark:text-slate-200">
                          {h.date}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                          {h.name}
                        </td>
                        <td className="py-3 px-4">
                          {h.isOptional ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                              Optional / Floating
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                              Mandatory Holiday
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-400 max-w-xs truncate">
                          {h.description || 'Public Holiday'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteHoliday(h.id)}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <PaginationControls
                  currentPage={holidayPage}
                  pageSize={holidayPageSize}
                  totalEntries={holidays.length}
                  pageSizeOptions={[10, 25, 50, 100]}
                  onPageChange={setHolidayPage}
                  onPageSizeChange={(newSize) => {
                    setHolidayPageSize(newSize);
                    setHolidayPage(1);
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. GEOFENCE CONFIGURATION TAB */}
      {activeSubTab === 'GEOFENCE' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs max-w-2xl space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Office Geofence & Perimeter Rules
              </h3>
              <p className="text-xs text-slate-400">
                Validate employee clock-in against corporate coordinates using GPS Haversine verification
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveGeofence} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                  Office Latitude *
                </label>
                <input
                  type="number"
                  step="any"
                  value={geofence.officeLatitude}
                  onChange={(e) => setGeofence({ ...geofence, officeLatitude: Number(e.target.value) })}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono-num font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                  Office Longitude *
                </label>
                <input
                  type="number"
                  step="any"
                  value={geofence.officeLongitude}
                  onChange={(e) => setGeofence({ ...geofence, officeLongitude: Number(e.target.value) })}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono-num font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">
                Allowed Radius (Meters)
              </label>
              <input
                type="number"
                value={geofence.allowedRadiusMeters}
                onChange={(e) => setGeofence({ ...geofence, allowedRadiusMeters: Number(e.target.value) })}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono-num font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Employees punching beyond this distance from the office coordinate will be flagged.
              </span>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={geofence.isEnforced}
                  onChange={(e) => setGeofence({ ...geofence, isEnforced: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <strong className="block text-slate-900 dark:text-white">Strict Geofence Enforcement</strong>
                  <span className="text-[10px] text-slate-400 block">
                    If checked, punches outside the perimeter will be rejected automatically.
                  </span>
                </div>
              </label>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                disabled={savingGeofence}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
              >
                {savingGeofence ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Geofence Rules</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. RBAC PERMISSIONS MATRIX TAB */}
      {activeSubTab === 'RBAC_PERMISSIONS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Role-Based Access Control (RBAC) Permissions Matrix
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dynamically assign functional capabilities to system and custom roles across all modules.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Role:</span>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.code})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleSaveRolePermissions}
                disabled={savingRbac}
                className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {savingRbac ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Permissions
              </button>
            </div>
          </div>

          {loadingRbac ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
              Loading permissions schema...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(
                allPermissions.reduce((acc: Record<string, any[]>, p: any) => {
                  acc[p.module] = acc[p.module] || [];
                  acc[p.module].push(p);
                  return acc;
                }, {})
              ).map(([moduleName, perms]) => {
                const currentRolePerms = rolePermissionsMap[selectedRoleId] || [];
                const allModuleChecked = perms.every((p: any) => currentRolePerms.includes(p.key));

                const toggleAllInModule = () => {
                  const moduleKeys = perms.map((p: any) => p.key);
                  let updated: string[];
                  if (allModuleChecked) {
                    updated = currentRolePerms.filter((k: string) => !moduleKeys.includes(k));
                  } else {
                    updated = Array.from(new Set([...currentRolePerms, ...moduleKeys]));
                  }
                  setRolePermissionsMap({
                    ...rolePermissionsMap,
                    [selectedRoleId]: updated
                  });
                };

                return (
                  <div
                    key={moduleName}
                    className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <strong className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        {moduleName}
                      </strong>
                      <button
                        type="button"
                        onClick={toggleAllInModule}
                        className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {allModuleChecked ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {perms.map((p: any) => {
                        const isChecked = currentRolePerms.includes(p.key);
                        return (
                          <label
                            key={p.id}
                            className="flex items-start gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer transition"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => togglePermissionForSelectedRole(p.key)}
                              className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                            />
                            <div>
                              <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200 block">
                                {p.key}
                              </span>
                              <span className="text-[10px] text-slate-400 block leading-tight">
                                {p.description || p.key}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Shift Modal */}
      {isAddShiftOpen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Create New Work Shift</h3>
            <form onSubmit={handleAddShift} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Shift Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Morning General Shift"
                  value={newShift.name}
                  onChange={(e) => setNewShift({ ...newShift, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Shift Code *</label>
                <input
                  type="text"
                  placeholder="e.g. MORNING-A"
                  value={newShift.code}
                  onChange={(e) => setNewShift({ ...newShift, code: e.target.value.toUpperCase() })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newShift.startTime}
                    onChange={(e) => setNewShift({ ...newShift, startTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono-num font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">End Time</label>
                  <input
                    type="time"
                    value={newShift.endTime}
                    onChange={(e) => setNewShift({ ...newShift, endTime: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono-num font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Grace Period (Minutes)</label>
                <input
                  type="number"
                  value={newShift.graceMinutes}
                  onChange={(e) => setNewShift({ ...newShift, graceMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono-num"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddShiftOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingShift}
                  className="px-4 py-2 rounded-xl text-white font-bold bg-indigo-600 hover:bg-indigo-700"
                >
                  {savingShift ? 'Saving...' : 'Create Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add Holiday Modal */}
      {isAddHolidayOpen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Add Holiday to Calendar</h3>
            <form onSubmit={handleAddHoliday} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Holiday Date *</label>
                <input
                  type="date"
                  value={newHoliday.date}
                  onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono-num font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Holiday Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Diwali Festival"
                  value={newHoliday.name}
                  onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-bold mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Festival of Lights public holiday"
                  value={newHoliday.description}
                  onChange={(e) => setNewHoliday({ ...newHoliday, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={newHoliday.isOptional}
                    onChange={(e) => setNewHoliday({ ...newHoliday, isOptional: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span>Optional / Restricted Holiday</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddHolidayOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingHoliday}
                  className="px-4 py-2 rounded-xl text-white font-bold bg-indigo-600 hover:bg-indigo-700"
                >
                  {savingHoliday ? 'Adding...' : 'Add Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Shift Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteShiftId}
        title="Delete Shift Configuration"
        message="Are you sure you want to remove this shift timing? Employees assigned to this shift may need reassignment."
        confirmText="Yes, Delete Shift"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={executeDeleteShift}
        onCancel={() => setDeleteShiftId(null)}
      />

      {/* Delete Holiday Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteHolidayId}
        title="Remove Holiday"
        message="Are you sure you want to remove this holiday from the corporate calendar?"
        confirmText="Yes, Remove Holiday"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={executeDeleteHoliday}
        onCancel={() => setDeleteHolidayId(null)}
      />

    </div>
  );
};
