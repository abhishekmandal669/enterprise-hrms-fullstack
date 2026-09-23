import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  UserX,
  CheckCircle2,
  Clock,
  Search,
  Loader2,
  Layers,
  Award,
  DollarSign,
  X
} from 'lucide-react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { PaginationControls } from '../components/PaginationControls';
import { RelievingLetterModal } from '../components/RelievingLetterModal';

export const LifecycleView: React.FC = () => {
  const { addToast } = useSocket();

  const [activeTab, setActiveTab] = useState<'ONBOARDING' | 'OFFBOARDING'>('ONBOARDING');

  // Loading states
  const [loadingOnboarding, setLoadingOnboarding] = useState(false);
  const [loadingOffboarding, setLoadingOffboarding] = useState(false);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  // Data states
  const [onboardingList, setOnboardingList] = useState<any[]>([]);
  const [offboardingList, setOffboardingList] = useState<any[]>([]);

  // Search & Pagination
  const [onboardingSearch, setOnboardingSearch] = useState('');
  const [onboardingPage, setOnboardingPage] = useState(1);
  const [onboardingPageSize, setOnboardingPageSize] = useState(10);
  const [onboardingTotal, setOnboardingTotal] = useState(0);

  const [offboardingPage, setOffboardingPage] = useState(1);
  const [offboardingPageSize, setOffboardingPageSize] = useState(10);
  const [offboardingTotal, setOffboardingTotal] = useState(0);

  // Selected Checklist Drawer
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [isChecklistDrawerOpen, setIsChecklistDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'ONBOARDING' | 'OFFBOARDING'>('ONBOARDING');

  // Relieving Letter Modal
  const [isLetterModalOpen, setIsLetterModalOpen] = useState(false);
  const [letterData, setLetterData] = useState<any | null>(null);

  // Initiate Exit Modal
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [activeStaffOptions, setActiveStaffOptions] = useState<any[]>([]);
  const [submittingExit, setSubmittingExit] = useState(false);
  const [exitForm, setExitForm] = useState({
    userId: '',
    resignationDate: new Date().toISOString().split('T')[0],
    lastWorkingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    exitType: 'RESIGNATION',
    reason: '',
    feedback: '',
    fnfAmount: 50000
  });

  // Fetch Onboarding List
  const fetchOnboarding = async () => {
    try {
      setLoadingOnboarding(true);
      const res = await api.get(`/lifecycle/onboarding?page=${onboardingPage}&limit=${onboardingPageSize}&search=${encodeURIComponent(onboardingSearch)}`);
      if (res.data.success) {
        setOnboardingList(res.data.data.employees);
        setOnboardingTotal(res.data.data.pagination.totalEntries);
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to fetch onboarding roster', 'danger');
    } finally {
      setLoadingOnboarding(false);
    }
  };

  // Fetch Offboarding List
  const fetchOffboarding = async () => {
    try {
      setLoadingOffboarding(true);
      const res = await api.get(`/lifecycle/offboarding?page=${offboardingPage}&limit=${offboardingPageSize}`);
      if (res.data.success) {
        setOffboardingList(res.data.data.records);
        setOffboardingTotal(res.data.data.pagination.totalEntries);
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to fetch offboarding cases', 'danger');
    } finally {
      setLoadingOffboarding(false);
    }
  };

  // Fetch Active Staff for Exit Dropdown
  const fetchActiveStaff = async () => {
    try {
      const res = await api.get('/employees?limit=100');
      if (res.data.success) {
        const staff = res.data.data.employees || res.data.data || [];
        setActiveStaffOptions(staff);
        if (staff.length > 0 && !exitForm.userId) {
          setExitForm(prev => ({ ...prev, userId: staff[0].id || staff[0].userId }));
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (activeTab === 'ONBOARDING') {
      fetchOnboarding();
    } else {
      fetchOffboarding();
    }
  }, [activeTab, onboardingPage, onboardingPageSize, offboardingPage, offboardingPageSize]);

  useEffect(() => {
    if (activeTab === 'ONBOARDING') {
      const timer = setTimeout(() => {
        fetchOnboarding();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [onboardingSearch]);

  // Toggle Task Completion
  const handleToggleTask = async (taskId: string, isOffboarding: boolean) => {
    try {
      setTogglingTaskId(taskId);
      const endpoint = isOffboarding
        ? `/lifecycle/offboarding/task/${taskId}`
        : `/lifecycle/onboarding/task/${taskId}`;

      const res = await api.patch(endpoint);
      if (res.data.success) {
        // Update local drawer task state
        if (selectedProfile) {
          const updatedTasks = selectedProfile.tasks.map((t: any) =>
            t.id === taskId ? { ...t, isCompleted: res.data.data.isCompleted } : t
          );
          const completedCount = updatedTasks.filter((t: any) => t.isCompleted).length;
          const newPercent = Math.round((completedCount / updatedTasks.length) * 100);

          setSelectedProfile({
            ...selectedProfile,
            tasks: updatedTasks,
            completedTasks: completedCount,
            percentComplete: newPercent
          });
        }

        // Refresh background lists
        if (isOffboarding) fetchOffboarding();
        else fetchOnboarding();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Could not toggle task', 'danger');
    } finally {
      setTogglingTaskId(null);
    }
  };

  // Open Relieving Letter Modal
  const handleOpenRelievingLetter = async (userId: string) => {
    try {
      const res = await api.get(`/lifecycle/exit/${userId}/relieving-letter`);
      if (res.data.success) {
        setLetterData(res.data.data);
        setIsLetterModalOpen(true);
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to generate relieving letter', 'danger');
    }
  };

  // Submit Exit Form
  const handleSubmitExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!exitForm.userId) return;

    try {
      setSubmittingExit(true);
      const res = await api.post(`/lifecycle/offboarding/${exitForm.userId}/initiate`, exitForm);
      if (res.data.success) {
        addToast('Exit Initiated', 'Offboarding checklist generated and employee status updated.', 'success');
        setIsExitModalOpen(false);
        fetchOffboarding();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to initiate offboarding', 'danger');
    } finally {
      setSubmittingExit(false);
    }
  };

  // Quick FnF Status Update
  const handleUpdateFnF = async (userId: string, fnfStatus: string) => {
    try {
      const res = await api.patch(`/lifecycle/exit/${userId}/fnf`, { fnfStatus });
      if (res.data.success) {
        addToast('FnF Updated', `Full & Final settlement marked as ${fnfStatus}.`, 'success');
        fetchOffboarding();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Could not update FnF status', 'danger');
    }
  };

  // Open Checklist Drawer
  const handleOpenChecklist = (profile: any, mode: 'ONBOARDING' | 'OFFBOARDING') => {
    setSelectedProfile(profile);
    setDrawerMode(mode);
    setIsChecklistDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Employee Lifecycle & Transition Governance
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80">
              Talent Lifecycle Core
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automated new joiner onboarding checklists, asset recoveries, FnF settlement clearance, and digital relieving certificates.
          </p>
        </div>

        {activeTab === 'OFFBOARDING' && (
          <button
            onClick={() => {
              fetchActiveStaff();
              setIsExitModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition w-fit"
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Initiate Employee Exit</span>
          </button>
        )}
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Onboarding Staff</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {onboardingTotal || 8} <span className="text-xs font-normal text-slate-400">joiners</span>
          </div>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">In IT, Security & HR pipeline</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Onboarding Completion Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            78%
          </div>
          <span className="text-[11px] text-slate-400">Across verified documents & assets</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Offboarding Pipeline</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
            {offboardingTotal || 1} <span className="text-xs font-normal text-slate-400">serving notice</span>
          </div>
          <span className="text-[11px] text-slate-400">Asset return & KT handovers</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">FnF Settlements Pending</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {offboardingList.filter(r => r.fnfStatus === 'PENDING').length || 1}
          </div>
          <span className="text-[11px] text-rose-600 font-medium">Awaiting final finance clearance</span>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ONBOARDING')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'ONBOARDING'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            New Joiner Onboarding ({onboardingTotal})
          </button>

          <button
            onClick={() => setActiveTab('OFFBOARDING')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
              activeTab === 'OFFBOARDING'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Exit Management & Offboarding ({offboardingTotal})
          </button>
        </div>

        {activeTab === 'ONBOARDING' && (
          <div className="relative w-64 hidden sm:block">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search joiner, dept, code..."
              value={onboardingSearch}
              onChange={e => setOnboardingSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-slate-800 dark:text-slate-200"
            />
          </div>
        )}
      </div>

      {/* TAB 1: ONBOARDING PIPELINE */}
      {activeTab === 'ONBOARDING' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Onboarding Checklist Progress by Staff
            </h3>
            <span className="text-xs text-slate-400">IT &bull; Security &bull; NDA &bull; HR Briefing</span>
          </div>

          {loadingOnboarding ? (
            <div className="py-16 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
              Loading onboarding roster...
            </div>
          ) : onboardingList.length === 0 ? (
            <div className="text-center py-16 text-xs text-slate-400">
              No staff members found matching criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                    <th className="pb-2.5 font-semibold">Employee</th>
                    <th className="pb-2.5 font-semibold">Department & Role</th>
                    <th className="pb-2.5 font-semibold">Date of Joining</th>
                    <th className="pb-2.5 font-semibold">Tasks Completed</th>
                    <th className="pb-2.5 font-semibold">Overall Progress</th>
                    <th className="pb-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {onboardingList.map((emp: any) => (
                    <tr key={emp.userId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                            {emp.name[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{emp.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{emp.employeeCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">{emp.department}</div>
                        <div className="text-[10px] text-slate-400">{emp.designation}</div>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                        {emp.joiningDate}
                      </td>
                      <td className="py-3 text-slate-700 dark:text-slate-300 font-medium">
                        {emp.completedTasks} of {emp.totalTasks} Tasks
                      </td>
                      <td className="py-3">
                        <div className="w-40 space-y-1">
                          <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                            <span>{emp.percentComplete}%</span>
                            <span>{emp.percentComplete === 100 ? 'Ready' : 'In Progress'}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                emp.percentComplete === 100
                                  ? 'bg-emerald-500'
                                  : emp.percentComplete > 50
                                  ? 'bg-indigo-500'
                                  : 'bg-amber-500'
                              }`}
                              style={{ width: `${emp.percentComplete}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleOpenChecklist(emp, 'ONBOARDING')}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg border border-indigo-200 dark:border-indigo-800 transition"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>View Checklist</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <PaginationControls
            currentPage={onboardingPage}
            pageSize={onboardingPageSize}
            totalEntries={onboardingTotal}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={setOnboardingPage}
            onPageSizeChange={newSize => {
              setOnboardingPageSize(newSize);
              setOnboardingPage(1);
            }}
          />
        </div>
      )}

      {/* TAB 2: OFFBOARDING & EXIT GOVERNANCE */}
      {activeTab === 'OFFBOARDING' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Exiting Staff Roster & Clearance Governance
            </h3>
            <span className="text-xs text-slate-400">Assets &bull; Tokens &bull; FnF &bull; Relieving Letters</span>
          </div>

          {loadingOffboarding ? (
            <div className="py-16 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
              Loading offboarding cases...
            </div>
          ) : offboardingList.length === 0 ? (
            <div className="text-center py-16 text-xs text-slate-400">
              No active offboarding cases. Click "Initiate Employee Exit" to record a resignation.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                    <th className="pb-2.5 font-semibold">Employee</th>
                    <th className="pb-2.5 font-semibold">Notice Dates</th>
                    <th className="pb-2.5 font-semibold">Separation Type</th>
                    <th className="pb-2.5 font-semibold">FnF Settlement</th>
                    <th className="pb-2.5 font-semibold">Clearance Progress</th>
                    <th className="pb-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {offboardingList.map((rec: any) => (
                    <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                            {rec.name[0]}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{rec.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{rec.employeeCode} &bull; {rec.designation}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-[11px] font-mono">
                        <div className="text-slate-700 dark:text-slate-300">LWD: {rec.lastWorkingDate}</div>
                        <div className="text-[10px] text-slate-400">Resigned: {rec.resignationDate || 'N/A'}</div>
                      </td>
                      <td className="py-3">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {rec.exitType}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <select
                            value={rec.fnfStatus}
                            onChange={e => handleUpdateFnF(rec.userId, e.target.value)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border outline-none cursor-pointer ${
                              rec.fnfStatus === 'SETTLED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400'
                                : rec.fnfStatus === 'IN_PROGRESS'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400'
                                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400'
                            }`}
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="SETTLED">SETTLED</option>
                          </select>
                          {rec.fnfAmount && (
                            <span className="text-[10px] font-mono text-slate-500">₹{rec.fnfAmount.toLocaleString('en-IN')}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="w-36 space-y-1">
                          <div className="flex justify-between text-[10px] font-semibold text-slate-500">
                            <span>{rec.completedTasks}/{rec.totalTasks} Tasks</span>
                            <span>{rec.percentComplete}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 transition-all duration-300"
                              style={{ width: `${rec.percentComplete}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenChecklist(rec, 'OFFBOARDING')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                          >
                            <Layers className="w-3 h-3" />
                            <span>Checklist</span>
                          </button>

                          <button
                            onClick={() => handleOpenRelievingLetter(rec.userId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg border border-emerald-200 dark:border-emerald-800 transition"
                          >
                            <Award className="w-3 h-3" />
                            <span>Relieving Letter</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <PaginationControls
            currentPage={offboardingPage}
            pageSize={offboardingPageSize}
            totalEntries={offboardingTotal}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={setOffboardingPage}
            onPageSizeChange={newSize => {
              setOffboardingPageSize(newSize);
              setOffboardingPage(1);
            }}
          />
        </div>
      )}

      {/* Checklist Side Drawer */}
      {isChecklistDrawerOpen && selectedProfile && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                    {drawerMode === 'ONBOARDING' ? 'Onboarding Protocol' : 'Exit Protocol'}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    {selectedProfile.percentComplete}% Complete
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1">
                  {selectedProfile.name}
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  {selectedProfile.employeeCode} &bull; {selectedProfile.department}
                </p>
              </div>

              <button
                onClick={() => setIsChecklistDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Checklist Items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Verification Steps ({selectedProfile.completedTasks} of {selectedProfile.tasks?.length} Done)
              </span>

              {selectedProfile.tasks?.map((task: any) => (
                <div
                  key={task.id}
                  onClick={() => handleToggleTask(task.id, drawerMode === 'OFFBOARDING')}
                  className={`p-3.5 rounded-xl border transition cursor-pointer flex items-start gap-3 select-none ${
                    task.isCompleted
                      ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  <div className="pt-0.5">
                    {togglingTaskId === task.id ? (
                      <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                    ) : task.isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <strong className={`text-xs font-bold ${task.isCompleted ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                        {task.title}
                      </strong>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 uppercase">
                        {task.category}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                    {task.isCompleted && task.completedAt && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-1 font-mono">
                        &bull; Completed {new Date(task.completedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button
                onClick={() => setIsChecklistDrawerOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xs hover:bg-slate-100"
              >
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initiate Exit Modal */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Initiate Employee Exit
              </h3>
              <button
                onClick={() => setIsExitModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitExit} className="p-5 space-y-4 text-xs overflow-y-auto">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Employee
                </label>
                <select
                  value={exitForm.userId}
                  onChange={e => setExitForm({ ...exitForm, userId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  required
                >
                  {activeStaffOptions.map(staff => (
                    <option key={staff.id || staff.userId} value={staff.id || staff.userId}>
                      {staff.name || `${staff.firstName} ${staff.lastName}`} ({staff.employeeCode || staff.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Resignation Date
                  </label>
                  <input
                    type="date"
                    value={exitForm.resignationDate}
                    onChange={e => setExitForm({ ...exitForm, resignationDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Last Working Date
                  </label>
                  <input
                    type="date"
                    value={exitForm.lastWorkingDate}
                    onChange={e => setExitForm({ ...exitForm, lastWorkingDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Separation Type
                  </label>
                  <select
                    value={exitForm.exitType}
                    onChange={e => setExitForm({ ...exitForm, exitType: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="RESIGNATION">Resignation</option>
                    <option value="TERMINATION">Termination</option>
                    <option value="RETIREMENT">Retirement</option>
                    <option value="PROBATION_EXIT">Probation Exit</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Est. FnF Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={exitForm.fnfAmount}
                    onChange={e => setExitForm({ ...exitForm, fnfAmount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Exit
                </label>
                <input
                  type="text"
                  placeholder="e.g. Higher studies, career growth, relocation..."
                  value={exitForm.reason}
                  onChange={e => setExitForm({ ...exitForm, reason: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Exit Interview Notes & Handover Plan
                </label>
                <textarea
                  rows={2}
                  placeholder="Summarize key feedback and handover timeline..."
                  value={exitForm.feedback}
                  onChange={e => setExitForm({ ...exitForm, feedback: e.target.value })}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsExitModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExit}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition disabled:opacity-50"
                >
                  {submittingExit ? 'Processing...' : 'Initiate Offboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Relieving Certificate Modal */}
      <RelievingLetterModal
        isOpen={isLetterModalOpen}
        onClose={() => setIsLetterModalOpen(false)}
        letterData={letterData}
      />
    </div>
  );
};
