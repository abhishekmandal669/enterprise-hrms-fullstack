import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Search,
  Download,
  BellRing,
  UserCheck,
  UserX,
  Building2
} from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { PaginationControls } from '../../components/PaginationControls';

export const TimesheetMonitoringView: React.FC = () => {
  const { addToast } = useSocket();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [complianceData, setComplianceData] = useState<any>(null);
  const [filterMode, setFilterMode] = useState<'ALL' | 'SUBMITTED' | 'MISSING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [nudgingEmployeeId, setNudgingEmployeeId] = useState<string | null>(null);

  // Pagination states (10, 25, 50, 100)
  const [missingPage, setMissingPage] = useState(1);
  const [missingPageSize, setMissingPageSize] = useState(10);
  const [submittedPage, setSubmittedPage] = useState(1);
  const [submittedPageSize, setSubmittedPageSize] = useState(10);

  const fetchCompliance = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/timesheets/compliance?date=${selectedDate}`);
      if (res.data.success) {
        setComplianceData(res.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch timesheet compliance:', err);
      addToast('Error', err.response?.data?.message || 'Could not fetch compliance data', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompliance();
  }, [selectedDate]);

  const handleSendNudge = async (employee: any) => {
    try {
      const empId = employee.id || employee.userId;
      const firstName = employee.firstName || employee.name?.split(' ')[0] || 'Team Member';
      const lastName = employee.lastName || employee.name?.split(' ').slice(1).join(' ') || '';
      const dept = typeof employee.department === 'string' ? employee.department : (employee.department?.name || 'GENERAL');
      setNudgingEmployeeId(empId);
      await api.post('/broadcasts', {
        title: `Timesheet Reminder for ${selectedDate}`,
        content: `Hi ${firstName}, your daily work timesheet for ${selectedDate} has not been logged yet. Please log your hours to remain compliant with HR policies.`,
        priority: 'NORMAL',
        department: dept
      });
      addToast('Reminder Sent', `Compliance nudge broadcast sent to ${firstName} ${lastName}.`, 'success');
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to send reminder', 'danger');
    } finally {
      setNudgingEmployeeId(null);
    }
  };

  const handleExportCSV = () => {
    if (!complianceData) return;
    const rows = [
      ['Employee Code', 'Full Name', 'Department', 'Role', 'Status', 'Logged Hours', 'Project(s)']
    ];

    const rawSub = complianceData.submitted || complianceData.submittedUsers || [];
    rawSub.forEach((item: any) => {
      const code = item.employeeCode || item.user?.employeeCode || 'N/A';
      const name = item.name || `${item.user?.firstName || item.firstName || ''} ${item.user?.lastName || item.lastName || ''}`.trim();
      const dept = typeof item.department === 'string' ? item.department : (item.user?.department || 'N/A');
      const role = item.role || item.user?.role || item.designation || 'N/A';
      const hrs = item.totalHours ?? (item.totalMinutes ? (item.totalMinutes / 60).toFixed(1) : 0);
      const proj = item.projectName || item.project?.name || item.taskTitle || 'General';
      rows.push([
        code,
        `"${name}"`,
        dept,
        role,
        'SUBMITTED',
        String(hrs),
        `"${proj}"`
      ]);
    });

    const rawMis = complianceData.missing || complianceData.pendingUsers || [];
    rawMis.forEach((emp: any) => {
      const code = emp.employeeCode || emp.user?.employeeCode || 'N/A';
      const name = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
      const dept = typeof emp.department === 'string' ? emp.department : (emp.user?.department || 'N/A');
      const role = emp.role || emp.designation || 'N/A';
      rows.push([
        code,
        `"${name}"`,
        dept,
        role,
        'MISSING',
        '0',
        '-'
      ]);
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `timesheet_compliance_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Report Exported', `Compliance report for ${selectedDate} downloaded.`, 'success');
  };

  const rawSubmitted = complianceData?.submitted || complianceData?.submittedUsers || [];
  const submittedList = rawSubmitted.filter((item: any) => {
    const q = searchQuery.toLowerCase();
    const name = (item.name || `${item.user?.firstName || item.firstName || ''} ${item.user?.lastName || item.lastName || ''}`).toLowerCase();
    const code = (item.employeeCode || item.user?.employeeCode || item.email || '').toLowerCase();
    const dept = (typeof item.department === 'string' ? item.department : (item.user?.department || '')).toLowerCase();
    return name.includes(q) || code.includes(q) || dept.includes(q);
  });

  const rawMissing = complianceData?.missing || complianceData?.pendingUsers || [];
  const missingList = rawMissing.filter((emp: any) => {
    const q = searchQuery.toLowerCase();
    const name = (emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`).toLowerCase();
    const code = (emp.employeeCode || emp.email || '').toLowerCase();
    const dept = (typeof emp.department === 'string' ? emp.department : (emp.department?.name || '')).toLowerCase();
    return name.includes(q) || code.includes(q) || dept.includes(q);
  });

  useEffect(() => {
    setMissingPage(1);
    setSubmittedPage(1);
  }, [searchQuery, selectedDate, filterMode]);

  const paginatedMissingList = missingList.slice(
    (missingPage - 1) * missingPageSize,
    missingPage * missingPageSize
  );

  const paginatedSubmittedList = submittedList.slice(
    (submittedPage - 1) * submittedPageSize,
    submittedPage * submittedPageSize
  );

  const activeHeadcount = complianceData?.activeHeadcount ?? complianceData?.totalEmployees ?? (rawSubmitted.length + rawMissing.length);
  const submittedCount = complianceData?.submittedCount ?? rawSubmitted.length;
  const missingCount = complianceData?.missingCount ?? rawMissing.length;
  const complianceRate = activeHeadcount > 0 ? Math.round((submittedCount / activeHeadcount) * 100) : (submittedCount > 0 ? 100 : 0);
  const totalTrackedHours = rawSubmitted.reduce((acc: number, curr: any) => acc + (curr.totalHours ?? (curr.totalMinutes ? curr.totalMinutes / 60 : 0)), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Timesheet Governance & Compliance
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Admin & HR Monitor
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit daily work logging compliance. (Notice: Timesheets are log-only; no approval friction required).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 shadow-xs">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="text-xs font-semibold bg-transparent border-none outline-none text-slate-800 dark:text-slate-200"
            />
          </div>

          <button
            onClick={handleExportCSV}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Active Staff</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {activeHeadcount}
          </div>
          <span className="text-[11px] text-slate-400">Eligible headcount for {selectedDate}</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Submitted Work Logs</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {submittedCount}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-500 font-medium">
            {complianceRate}% Compliance Rate
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Missing Submissions</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
            {missingCount}
          </div>
          <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
            {activeHeadcount > 0 ? Math.round((missingCount / activeHeadcount) * 100) : 0}% Pending action
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Tracked Productive Time</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {totalTrackedHours.toFixed(1)} <span className="text-sm font-normal text-slate-400">hrs</span>
          </div>
          <span className="text-[11px] text-slate-400">Across all recorded projects today</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700 rounded-lg w-fit">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              filterMode === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            All Staff ({activeHeadcount})
          </button>
          <button
            onClick={() => setFilterMode('SUBMITTED')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              filterMode === 'SUBMITTED'
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Submitted ({submittedCount})
          </button>
          <button
            onClick={() => setFilterMode('MISSING')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              filterMode === 'MISSING'
                ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Missing ({missingCount})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee, dept, code..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-400 mt-2">Aggregating timesheet compliance data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Missing Section */}
          {(filterMode === 'ALL' || filterMode === 'MISSING') && (
            missingList.length > 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-950/60 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-rose-50 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center">
                      <UserX className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Missing Timesheets for {selectedDate} ({missingList.length})
                    </h3>
                  </div>
                  <span className="text-[10px] text-rose-500 font-semibold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200/60 dark:border-rose-900/60">
                    Action Required
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                        <th className="pb-2.5 font-semibold">Employee</th>
                        <th className="pb-2.5 font-semibold">Department</th>
                        <th className="pb-2.5 font-semibold">Role / Designation</th>
                        <th className="pb-2.5 font-semibold">Status</th>
                        <th className="pb-2.5 font-semibold text-right">Quick Nudge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {paginatedMissingList.map((emp: any) => {
                        const empId = emp.id || emp.userId;
                        const fullName = emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Employee';
                        const code = emp.employeeCode || emp.user?.employeeCode || emp.email || 'N/A';
                        const dept = typeof emp.department === 'string' ? emp.department : (emp.department?.name || emp.user?.department?.name || 'General');
                        const roleOrDesignation = emp.designation || emp.role || 'Staff';
                        const avatar = emp.avatarUrl || emp.user?.avatarUrl;
                        const initial = (emp.firstName?.[0] || emp.name?.[0] || 'U').toUpperCase();

                        return (
                          <tr key={empId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                            <td className="py-3">
                              <div className="flex items-center gap-2.5">
                                {avatar ? (
                                  <img
                                    src={avatar}
                                    alt=""
                                    className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 text-xs">
                                    {initial}
                                  </div>
                                )}
                                <div>
                                  <div className="font-semibold text-slate-900 dark:text-white">
                                    {fullName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {code}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-slate-600 dark:text-slate-300">
                              {dept}
                            </td>
                            <td className="py-3 text-slate-500">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {roleOrDesignation}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                                <AlertCircle className="w-2.5 h-2.5" />
                                Not Logged
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleSendNudge(emp)}
                                disabled={nudgingEmployeeId === empId}
                                className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg border border-indigo-200 dark:border-indigo-800 transition shadow-2xs"
                              >
                                {nudgingEmployeeId === empId ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <BellRing className="w-3 h-3" />
                                )}
                                <span>Send Nudge</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <PaginationControls
                  currentPage={missingPage}
                  pageSize={missingPageSize}
                  totalEntries={missingList.length}
                  pageSizeOptions={[10, 25, 50, 100]}
                  onPageChange={setMissingPage}
                  onPageSizeChange={(newSize) => {
                    setMissingPageSize(newSize);
                    setMissingPage(1);
                  }}
                />
              </div>
            ) : filterMode === 'MISSING' ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">All Employees Compliant</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  {searchQuery ? 'No missing staff match your current search query.' : `All eligible staff members have logged their daily work for ${selectedDate}.`}
                </p>
              </div>
            ) : null
          )}

          {/* Submitted Section */}
          {(filterMode === 'ALL' || filterMode === 'SUBMITTED') && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 flex items-center justify-center">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Compliant Submissions for {selectedDate} ({submittedList.length})
                  </h3>
                </div>
                <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200/60 dark:border-emerald-900/60">
                  Verified Logs
                </span>
              </div>

              {submittedList.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400">
                  {searchQuery ? 'No submitted work logs match your search filter.' : 'No work logs recorded yet for this date.'}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                          <th className="pb-2.5 font-semibold">Employee</th>
                          <th className="pb-2.5 font-semibold">Project & Task</th>
                          <th className="pb-2.5 font-semibold">Logged Duration</th>
                          <th className="pb-2.5 font-semibold">Department</th>
                          <th className="pb-2.5 font-semibold text-right">Submission State</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {paginatedSubmittedList.map((item: any) => {
                          const fullName = item.name || `${item.user?.firstName || item.firstName || ''} ${item.user?.lastName || item.lastName || ''}`.trim() || 'Employee';
                          const code = item.user?.employeeCode || item.employeeCode || item.user?.email || item.email || 'N/A';
                          const avatar = item.user?.avatarUrl || item.avatarUrl;
                          const initial = (item.user?.firstName?.[0] || item.firstName?.[0] || item.name?.[0] || 'U').toUpperCase();
                          const projectName = item.project?.name || item.projectName || item.taskTitle || 'General Deliverables';
                          const dept = typeof item.department === 'string' ? item.department : (item.user?.department?.name || item.user?.department || 'General');
                          const hours = item.totalHours ?? (item.totalMinutes ? (item.totalMinutes / 60).toFixed(1) : 0);

                          return (
                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                              <td className="py-3">
                                <div className="flex items-center gap-2.5">
                                  {avatar ? (
                                    <img
                                      src={avatar}
                                      alt=""
                                      className="w-8 h-8 rounded-full object-cover ring-1 ring-indigo-200 dark:ring-indigo-800"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                                      {initial}
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-semibold text-slate-900 dark:text-white">
                                      {fullName}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      {code}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3">
                                <div className="font-medium text-slate-800 dark:text-slate-200">
                                  {projectName}
                                </div>
                                {item.activityDescription && (
                                  <div className="text-[10px] text-slate-400 truncate max-w-xs">
                                    {item.activityDescription}
                                  </div>
                                )}
                              </td>
                              <td className="py-3">
                                <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                                  <Clock className="w-3 h-3 text-indigo-500" />
                                  {hours} hrs
                                </span>
                              </td>
                              <td className="py-3 text-slate-600 dark:text-slate-300">
                                {dept}
                              </td>
                              <td className="py-3 text-right">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  <CheckCircle2 className="w-2.5 h-2.5" />
                                  Logged & Verified
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <PaginationControls
                    currentPage={submittedPage}
                    pageSize={submittedPageSize}
                    totalEntries={submittedList.length}
                    pageSizeOptions={[10, 25, 50, 100]}
                    onPageChange={setSubmittedPage}
                    onPageSizeChange={(newSize) => {
                      setSubmittedPageSize(newSize);
                      setSubmittedPage(1);
                    }}
                  />
                </>
              )}
            </div>
          )}

          {/* Empty state when filterMode === 'ALL' and nothing found at all */}
          {filterMode === 'ALL' && missingList.length === 0 && submittedList.length === 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">No Timesheet Records Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                No active staff or timesheet logs found for {selectedDate}.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
