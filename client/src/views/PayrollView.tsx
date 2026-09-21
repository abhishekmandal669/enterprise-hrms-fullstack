import React, { useState, useEffect } from 'react';
import {
  Banknote,
  TrendingUp,
  Users,
  ShieldCheck,
  Clock,
  Calendar,
  Search,
  Eye,
  CheckCircle2,
  Loader2,
  Pencil,
  Sparkles,
  Lock
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { PaginationControls } from '../components/PaginationControls';
import { PayslipModal } from '../components/PayslipModal';
import { CustomSelect } from '../components/CustomSelect';

export const PayrollView: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useSocket();

  const isAdminOrHR = user?.role === 'ADMIN' || user?.role === 'HR_ADMIN';

  // Subtabs
  const [activeTab, setActiveTab] = useState<'RUNS' | 'STRUCTURES' | 'ENTRIES' | 'MY_PAYSLIPS'>(
    isAdminOrHR ? 'RUNS' : 'MY_PAYSLIPS'
  );

  // Month & Year selection for Run Processing
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  // Loading states
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [loadingStructures, setLoadingStructures] = useState(false);
  const [loadingMyPayslips, setLoadingMyPayslips] = useState(false);
  const [isProcessingDraft, setIsProcessingDraft] = useState(false);
  const [finalizingRunId, setFinalizingRunId] = useState<string | null>(null);

  // Data states
  const [runs, setRuns] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [myPayslips, setMyPayslips] = useState<any[]>([]);
  const [selectedRun, setSelectedRun] = useState<any | null>(null);
  const [loadingRunDetail, setLoadingRunDetail] = useState(false);

  // Filter & Search
  const [structureSearch, setStructureSearch] = useState('');
  const [entrySearch, setEntrySearch] = useState('');

  // Pagination states
  const [runsPage, setRunsPage] = useState(1);
  const [runsPageSize, setRunsPageSize] = useState(10);
  const [runsTotal, setRunsTotal] = useState(0);

  const [structuresPage, setStructuresPage] = useState(1);
  const [structuresPageSize, setStructuresPageSize] = useState(10);
  const [structuresTotal, setStructuresTotal] = useState(0);

  const [entriesPage, setEntriesPage] = useState(1);
  const [entriesPageSize, setEntriesPageSize] = useState(10);

  const [myPayslipsPage, setMyPayslipsPage] = useState(1);
  const [myPayslipsPageSize, setMyPayslipsPageSize] = useState(10);
  const [myPayslipsTotal, setMyPayslipsTotal] = useState(0);

  // Modals
  const [viewingPayslipData, setViewingPayslipData] = useState<any | null>(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [savingStructure, setSavingStructure] = useState(false);

  // Edit structure form
  const [editForm, setEditForm] = useState({
    monthlyGross: 50000,
    basic: 25000,
    hra: 10000,
    da: 5000,
    specialAllowance: 10000,
    pfEmployee: 1800,
    pfEmployer: 1800,
    esi: 0,
    professionalTax: 200,
    tds: 2500
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Fetch Runs
  const fetchRuns = async () => {
    if (!isAdminOrHR) return;
    try {
      setLoadingRuns(true);
      const res = await api.get(`/payroll/runs?page=${runsPage}&limit=${runsPageSize}`);
      if (res.data.success) {
        setRuns(res.data.data.runs);
        setRunsTotal(res.data.data.pagination.totalEntries);
        // Auto-select first run if none selected
        if (!selectedRun && res.data.data.runs.length > 0) {
          fetchRunDetails(res.data.data.runs[0].id);
        }
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to fetch payroll runs', 'danger');
    } finally {
      setLoadingRuns(false);
    }
  };

  // Fetch Run Details
  const fetchRunDetails = async (runId: string) => {
    try {
      setLoadingRunDetail(true);
      const res = await api.get(`/payroll/runs/${runId}`);
      if (res.data.success) {
        setSelectedRun(res.data.data);
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to fetch run details', 'danger');
    } finally {
      setLoadingRunDetail(false);
    }
  };

  // Fetch Structures
  const fetchStructures = async () => {
    if (!isAdminOrHR) return;
    try {
      setLoadingStructures(true);
      const res = await api.get(`/payroll/structures?page=${structuresPage}&limit=${structuresPageSize}&search=${encodeURIComponent(structureSearch)}`);
      if (res.data.success) {
        setStructures(res.data.data.employees);
        setStructuresTotal(res.data.data.pagination.totalEntries);
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to fetch salary structures', 'danger');
    } finally {
      setLoadingStructures(false);
    }
  };

  // Fetch My Payslips (Employee Self-Service)
  const fetchMyPayslips = async () => {
    try {
      setLoadingMyPayslips(true);
      const res = await api.get(`/payroll/my-payslips?page=${myPayslipsPage}&limit=${myPayslipsPageSize}`);
      if (res.data.success) {
        setMyPayslips(res.data.data.entries);
        setMyPayslipsTotal(res.data.data.pagination.totalEntries);
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to fetch payslips', 'danger');
    } finally {
      setLoadingMyPayslips(false);
    }
  };

  useEffect(() => {
    if (isAdminOrHR) {
      if (activeTab === 'RUNS' || activeTab === 'ENTRIES') fetchRuns();
      if (activeTab === 'STRUCTURES') fetchStructures();
    }
    if (activeTab === 'MY_PAYSLIPS') fetchMyPayslips();
  }, [activeTab, runsPage, runsPageSize, structuresPage, structuresPageSize, myPayslipsPage, myPayslipsPageSize]);

  useEffect(() => {
    if (isAdminOrHR && activeTab === 'STRUCTURES') {
      const timer = setTimeout(() => {
        fetchStructures();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [structureSearch]);

  // Compute Draft Run
  const handleComputeDraft = async () => {
    try {
      setIsProcessingDraft(true);
      const res = await api.post('/payroll/runs/draft', {
        month: selectedMonth,
        year: selectedYear
      });
      if (res.data.success) {
        addToast('Draft Computed', `Payroll for ${monthNames[selectedMonth - 1]} ${selectedYear} calculated.`, 'success');
        fetchRuns();
        if (res.data.data?.id) {
          fetchRunDetails(res.data.data.id);
          setActiveTab('ENTRIES');
        }
      }
    } catch (err: any) {
      addToast('Computation Error', err.response?.data?.message || 'Failed to compute payroll', 'danger');
    } finally {
      setIsProcessingDraft(false);
    }
  };

  // Finalize Run
  const handleFinalizeRun = async (runId: string) => {
    try {
      setFinalizingRunId(runId);
      const res = await api.post(`/payroll/runs/${runId}/finalize`);
      if (res.data.success) {
        addToast('Payroll Finalized', 'Payroll locked, approved and payslips published.', 'success');
        fetchRuns();
        if (selectedRun?.id === runId) {
          fetchRunDetails(runId);
        }
      }
    } catch (err: any) {
      addToast('Finalize Error', err.response?.data?.message || 'Failed to finalize run', 'danger');
    } finally {
      setFinalizingRunId(null);
    }
  };

  // View Payslip Modal
  const handleOpenPayslip = async (entryId: string) => {
    try {
      const res = await api.get(`/payroll/payslip/${entryId}`);
      if (res.data.success) {
        setViewingPayslipData(res.data.data);
        setIsPayslipModalOpen(true);
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to load payslip data', 'danger');
    }
  };

  // Open Edit Structure
  const handleOpenEditStructure = (emp: any) => {
    setEditingEmployee(emp);
    const s = emp.salaryStructure || {};
    const monthlyGross = s.monthlyGross || 50000;
    const basic = s.basic || Number((monthlyGross * 0.5).toFixed(2));
    const hra = s.hra || Number((basic * 0.4).toFixed(2));
    const da = s.da || Number((monthlyGross * 0.1).toFixed(2));
    const specialAllowance = s.specialAllowance || Number((monthlyGross - (basic + hra + da)).toFixed(2));

    setEditForm({
      monthlyGross,
      basic,
      hra,
      da,
      specialAllowance,
      pfEmployee: s.pfEmployee || 1800,
      pfEmployer: s.pfEmployer || 1800,
      esi: s.esi || 0,
      professionalTax: s.professionalTax || 200,
      tds: s.tds || 2500
    });
    setIsEditModalOpen(true);
  };

  // Save Structure
  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;

    try {
      setSavingStructure(true);
      const res = await api.post(`/payroll/structure/${editingEmployee.userId}`, editForm);
      if (res.data.success) {
        addToast('Saved', `Salary structure for ${editingEmployee.name} updated.`, 'success');
        setIsEditModalOpen(false);
        fetchStructures();
      }
    } catch (err: any) {
      addToast('Save Failed', err.response?.data?.message || 'Could not update salary structure', 'danger');
    } finally {
      setSavingStructure(false);
    }
  };

  // Filter entries in active run
  const filteredEntries = (selectedRun?.entries || []).filter((e: any) => {
    const q = entrySearch.toLowerCase();
    return (
      e.name.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    );
  });

  const paginatedEntries = filteredEntries.slice(
    (entriesPage - 1) * entriesPageSize,
    entriesPage * entriesPageSize
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Payroll & Compensation Governance
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/80">
              {isAdminOrHR ? 'HR & Finance Command' : 'Employee Self-Service'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automated statutory compliance, LOP deduction, overtime disbursements and digitally stamped payslips.
          </p>
        </div>

        {isAdminOrHR && (
          <div className="flex items-center gap-2">
            <div className="w-[140px]">
              <CustomSelect
                value={selectedMonth}
                onChange={(val) => setSelectedMonth(Number(val))}
                size="sm"
                icon={<Calendar className="w-3.5 h-3.5 text-indigo-500" />}
                options={monthNames.map((name, i) => ({
                  value: i + 1,
                  label: name
                }))}
              />
            </div>
            <div className="w-[100px]">
              <CustomSelect
                value={selectedYear}
                onChange={(val) => setSelectedYear(Number(val))}
                size="sm"
                options={[2025, 2026, 2027].map((y) => ({
                  value: y,
                  label: String(y)
                }))}
              />
            </div>

            <button
              onClick={handleComputeDraft}
              disabled={isProcessingDraft}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition disabled:opacity-50"
            >
              {isProcessingDraft ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Calculate Payroll</span>
            </button>
          </div>
        )}
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Monthly Outflow</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            ₹{(selectedRun?.totalNetPay || 153833).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Active Net Disbursement ({monthNames[selectedMonth - 1]})
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Gross CTC</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2 font-mono">
            ₹{(selectedRun?.totalGrossPay || 765000).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400">Base before deductions & LOP</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Statutory Deductions</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2 font-mono">
            ₹{(selectedRun?.totalDeductions || 611166).toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400">PF, PT, TDS & Loss of Pay</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Headcount Covered</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {selectedRun?.totalEmployees || 8} <span className="text-xs font-normal text-slate-400">staff</span>
          </div>
          <span className="text-[11px] text-slate-400">100% active staff enrolled</span>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1.5">
          {isAdminOrHR && (
            <>
              <button
                onClick={() => setActiveTab('RUNS')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'RUNS'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Payroll Runs ({runsTotal})
              </button>
              <button
                onClick={() => setActiveTab('ENTRIES')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'ENTRIES'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Active Run Payouts {selectedRun ? `(${selectedRun.month}/${selectedRun.year})` : ''}
              </button>
              <button
                onClick={() => setActiveTab('STRUCTURES')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                  activeTab === 'STRUCTURES'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Salary Structures ({structuresTotal})
              </button>
            </>
          )}

          <button
            onClick={() => setActiveTab('MY_PAYSLIPS')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
              activeTab === 'MY_PAYSLIPS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            My Payslips ({myPayslipsTotal})
          </button>
        </div>
      </div>

      {/* TAB 1: RUNS LIST (Admin & HR) */}
      {isAdminOrHR && activeTab === 'RUNS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Disbursement Cycles & Records
            </h3>
            <span className="text-xs text-slate-400">Monthly fiscal runs</span>
          </div>

          {loadingRuns ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
              Loading payroll runs...
            </div>
          ) : runs.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No payroll runs created yet. Click "Calculate Payroll" above to initiate a run.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                    <th className="pb-2.5 font-semibold">Month & Year</th>
                    <th className="pb-2.5 font-semibold">Status</th>
                    <th className="pb-2.5 font-semibold">Headcount</th>
                    <th className="pb-2.5 font-semibold">Gross Pay</th>
                    <th className="pb-2.5 font-semibold">Deductions</th>
                    <th className="pb-2.5 font-semibold">Net Payout</th>
                    <th className="pb-2.5 font-semibold">Processed By</th>
                    <th className="pb-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {runs.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3 font-bold text-slate-900 dark:text-white">
                        {monthNames[r.month - 1]} {r.year}
                      </td>
                      <td className="py-3">
                        {r.status === 'FINALIZED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            FINALIZED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-2.5 h-2.5" />
                            DRAFT REVIEW
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">
                        {r.totalEmployees} Employees
                      </td>
                      <td className="py-3 font-mono text-slate-700 dark:text-slate-300">
                        ₹{r.totalGrossPay.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 font-mono text-rose-600 dark:text-rose-400">
                        ₹{r.totalDeductions.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{r.totalNetPay.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 text-slate-500">
                        {r.processedBy}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              fetchRunDetails(r.id);
                              setActiveTab('ENTRIES');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg border border-indigo-200 dark:border-indigo-800 transition"
                          >
                            <Eye className="w-3 h-3" />
                            <span>View Entries</span>
                          </button>

                          {r.status === 'DRAFT' && (
                            <button
                              onClick={() => handleFinalizeRun(r.id)}
                              disabled={finalizingRunId === r.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg border border-emerald-200 dark:border-emerald-800 transition"
                            >
                              {finalizingRunId === r.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Lock className="w-3 h-3" />
                              )}
                              <span>Finalize</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <PaginationControls
            currentPage={runsPage}
            pageSize={runsPageSize}
            totalEntries={runsTotal}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={setRunsPage}
            onPageSizeChange={newSize => {
              setRunsPageSize(newSize);
              setRunsPage(1);
            }}
          />
        </div>
      )}

      {/* TAB 2: ACTIVE RUN ENTRIES (Admin & HR) */}
      {isAdminOrHR && activeTab === 'ENTRIES' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Employee Payouts for {selectedRun ? `${monthNames[selectedRun.month - 1]} ${selectedRun.year}` : 'Active Run'}
                </h3>
                {selectedRun?.status === 'FINALIZED' ? (
                  <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                    FINALIZED & PUBLISHED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                    DRAFT (PENDING FINALIZATION)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Itemized breakdown of gross compensation, LOP attendance deductions, and net payout.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff, dept..."
                  value={entrySearch}
                  onChange={e => setEntrySearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-slate-200"
                />
              </div>

              {selectedRun && selectedRun.status === 'DRAFT' && (
                <button
                  onClick={() => handleFinalizeRun(selectedRun.id)}
                  disabled={finalizingRunId === selectedRun.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition"
                >
                  {finalizingRunId === selectedRun.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Lock className="w-3.5 h-3.5" />
                  )}
                  <span>Lock & Finalize Run</span>
                </button>
              )}
            </div>
          </div>

          {loadingRunDetail ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
              Loading payout entries...
            </div>
          ) : !selectedRun ? (
            <div className="text-center py-12 text-xs text-slate-400">
              Please select a payroll run from the "Payroll Runs" tab to view itemized entries.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                    <th className="pb-2.5 font-semibold">Employee</th>
                    <th className="pb-2.5 font-semibold">Department</th>
                    <th className="pb-2.5 font-semibold">Days Worked / Total</th>
                    <th className="pb-2.5 font-semibold">Loss of Pay (LOP)</th>
                    <th className="pb-2.5 font-semibold">Gross Pay</th>
                    <th className="pb-2.5 font-semibold">Deductions</th>
                    <th className="pb-2.5 font-semibold">Net Payout</th>
                    <th className="pb-2.5 font-semibold text-right">Payslip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {paginatedEntries.map((e: any) => (
                    <tr key={e.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          {e.avatarUrl ? (
                            <img src={e.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                              {e.name[0]}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{e.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{e.employeeCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">
                        {e.department}
                      </td>
                      <td className="py-3 text-slate-700 dark:text-slate-300 font-medium">
                        {e.presentDays} / {e.workingDays} Days
                      </td>
                      <td className="py-3">
                        {e.unpaidLeaveDays > 0 ? (
                          <span className="text-rose-600 font-semibold">{e.unpaidLeaveDays} Days</span>
                        ) : (
                          <span className="text-emerald-600">0 Days (Full)</span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-slate-700 dark:text-slate-300">
                        ₹{e.grossEarnings.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 font-mono text-rose-600 dark:text-rose-400">
                        ₹{e.totalDeductions.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{e.netPay.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleOpenPayslip(e.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg border border-indigo-200 dark:border-indigo-800 transition"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Slip</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <PaginationControls
            currentPage={entriesPage}
            pageSize={entriesPageSize}
            totalEntries={filteredEntries.length}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={setEntriesPage}
            onPageSizeChange={newSize => {
              setEntriesPageSize(newSize);
              setEntriesPage(1);
            }}
          />
        </div>
      )}

      {/* TAB 3: SALARY STRUCTURES MASTER (Admin & HR) */}
      {isAdminOrHR && activeTab === 'STRUCTURES' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Salary Structure Master Registry
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Configure basic pay, HRA, PF caps, and tax deductions per employee profile.
              </p>
            </div>

            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff, code, role..."
                value={structureSearch}
                onChange={e => setStructureSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {loadingStructures ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
              Loading compensation structures...
            </div>
          ) : structures.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No employee salary structures found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                    <th className="pb-2.5 font-semibold">Employee</th>
                    <th className="pb-2.5 font-semibold">Department</th>
                    <th className="pb-2.5 font-semibold">Monthly Gross (CTC)</th>
                    <th className="pb-2.5 font-semibold">Basic Pay</th>
                    <th className="pb-2.5 font-semibold">HRA</th>
                    <th className="pb-2.5 font-semibold">PF (Employee)</th>
                    <th className="pb-2.5 font-semibold">TDS</th>
                    <th className="pb-2.5 font-semibold">Est. Net Take-Home</th>
                    <th className="pb-2.5 font-semibold text-right">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {structures.map((s: any) => {
                    const st = s.salaryStructure || {};
                    const gross = st.monthlyGross || 0;
                    const basic = st.basic || 0;
                    const hra = st.hra || 0;
                    const pf = st.pfEmployee || 0;
                    const tds = st.tds || 0;
                    const pt = st.professionalTax || 200;
                    const estNet = Math.max(0, gross - (pf + tds + pt));

                    return (
                      <tr key={s.userId} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                        <td className="py-3">
                          <div className="flex items-center gap-2.5">
                            {s.avatarUrl ? (
                              <img src={s.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-xs">
                                {s.firstName[0]}
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">{s.name}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{s.employeeCode} &bull; {s.designation}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-slate-600 dark:text-slate-300">{s.department}</td>
                        <td className="py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                          ₹{gross.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 font-mono text-slate-600 dark:text-slate-300">
                          ₹{basic.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 font-mono text-slate-600 dark:text-slate-300">
                          ₹{hra.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 font-mono text-rose-600 dark:text-rose-400">
                          ₹{pf.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 font-mono text-slate-600 dark:text-slate-300">
                          ₹{tds.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{estNet.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleOpenEditStructure(s)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <PaginationControls
            currentPage={structuresPage}
            pageSize={structuresPageSize}
            totalEntries={structuresTotal}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={setStructuresPage}
            onPageSizeChange={newSize => {
              setStructuresPageSize(newSize);
              setStructuresPage(1);
            }}
          />
        </div>
      )}

      {/* TAB 4: MY PAYSLIPS (Employee Self-Service) */}
      {activeTab === 'MY_PAYSLIPS' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                My Salary Slips & Statements
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Download and view officially stamped monthly payslips.
              </p>
            </div>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              Tax year 2026-27
            </span>
          </div>

          {loadingMyPayslips ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
              Loading your payslips...
            </div>
          ) : myPayslips.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No finalized payslips published for your profile yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 text-[11px]">
                    <th className="pb-2.5 font-semibold">Month & Year</th>
                    <th className="pb-2.5 font-semibold">Status</th>
                    <th className="pb-2.5 font-semibold">Gross Pay</th>
                    <th className="pb-2.5 font-semibold">Total Deductions</th>
                    <th className="pb-2.5 font-semibold">Net Take-Home</th>
                    <th className="pb-2.5 font-semibold">Disbursed Date</th>
                    <th className="pb-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {myPayslips.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3 font-bold text-slate-900 dark:text-white">
                        {monthNames[p.month - 1]} {p.year}
                      </td>
                      <td className="py-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          PAID
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-700 dark:text-slate-300">
                        ₹{p.grossEarnings.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 font-mono text-rose-600 dark:text-rose-400">
                        ₹{p.totalDeductions.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{p.netPay.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 text-slate-500 font-mono text-[11px]">
                        {p.finalizedAt ? new Date(p.finalizedAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleOpenPayslip(p.id)}
                          className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg border border-indigo-200 dark:border-indigo-800 transition"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View & Print</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <PaginationControls
            currentPage={myPayslipsPage}
            pageSize={myPayslipsPageSize}
            totalEntries={myPayslipsTotal}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={setMyPayslipsPage}
            onPageSizeChange={newSize => {
              setMyPayslipsPageSize(newSize);
              setMyPayslipsPage(1);
            }}
          />
        </div>
      )}

      {/* Edit Salary Structure Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Edit Compensation Structure
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {editingEmployee?.name} ({editingEmployee?.employeeCode})
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveStructure} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Monthly Gross CTC (₹)
                  </label>
                  <input
                    type="number"
                    value={editForm.monthlyGross}
                    onChange={e => {
                      const val = Number(e.target.value);
                      const b = Number((val * 0.5).toFixed(2));
                      const h = Number((b * 0.4).toFixed(2));
                      const d = Number((val * 0.1).toFixed(2));
                      const s = Number((val - (b + h + d)).toFixed(2));
                      setEditForm(prev => ({
                        ...prev,
                        monthlyGross: val,
                        basic: b,
                        hra: h,
                        da: d,
                        specialAllowance: s
                      }));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-indigo-600 dark:text-indigo-400 text-sm"
                    required
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Auto-splits 50% Basic, 40% HRA, 10% DA</span>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Basic Salary (₹)</label>
                  <input
                    type="number"
                    value={editForm.basic}
                    onChange={e => setEditForm({ ...editForm, basic: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">HRA (₹)</label>
                  <input
                    type="number"
                    value={editForm.hra}
                    onChange={e => setEditForm({ ...editForm, hra: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Dearness Allowance (DA)</label>
                  <input
                    type="number"
                    value={editForm.da}
                    onChange={e => setEditForm({ ...editForm, da: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Special Allowance</label>
                  <input
                    type="number"
                    value={editForm.specialAllowance}
                    onChange={e => setEditForm({ ...editForm, specialAllowance: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">PF Employee (₹)</label>
                  <input
                    type="number"
                    value={editForm.pfEmployee}
                    onChange={e => setEditForm({ ...editForm, pfEmployee: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Professional Tax (PT)</label>
                  <input
                    type="number"
                    value={editForm.professionalTax}
                    onChange={e => setEditForm({ ...editForm, professionalTax: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Monthly TDS / Income Tax (₹)</label>
                  <input
                    type="number"
                    value={editForm.tds}
                    onChange={e => setEditForm({ ...editForm, tds: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStructure}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                >
                  {savingStructure ? 'Saving...' : 'Save Structure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payslip Inspection Modal */}
      <PayslipModal
        isOpen={isPayslipModalOpen}
        onClose={() => setIsPayslipModalOpen(false)}
        payslipData={viewingPayslipData}
      />
    </div>
  );
};
