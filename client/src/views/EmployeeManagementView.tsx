import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { UserPlus, UploadCloud, Search, Mail, RotateCw, CheckCircle, Shield, Building } from 'lucide-react';
import { AddEmployeeModal } from '../components/AddEmployeeModal';
import { BulkImportModal } from '../components/BulkImportModal';
import { EmployeeDetailDrawer } from '../components/EmployeeDetailDrawer';
import { PaginationControls } from '../components/PaginationControls';
import { Sparkles } from 'lucide-react';

interface EmployeeManagementViewProps {
  searchQuery: string;
}

export const EmployeeManagementView: React.FC<EmployeeManagementViewProps> = ({ searchQuery }) => {
  const { id: routeEmpId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { addToast } = useSocket();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'ACTIVE' | 'INVITED' | 'SUSPENDED'>('ACTIVE');
  const [localSearch, setLocalSearch] = useState('');
  
  // Pagination State (10, 25, 50, 100)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const selected360EmployeeId = routeEmpId || null;

  const handleOpen360 = (empId: string) => {
    navigate(`/employees/${empId}`);
  };

  const handleClose360 = () => {
    navigate('/employees');
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/employees?limit=100');
      if (res.data.success) {
        setEmployees(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleResendInvite = async (userId: string) => {
    try {
      const res = await api.post('/admin/employees/resend-invite', { userId });
      if (res.data.success) {
        navigator.clipboard.writeText(window.location.origin + res.data.data.inviteLink);
        addToast('Invite Refreshed', 'New 72-hour invite link copied to clipboard!', 'success');
        fetchEmployees();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to resend invite', 'danger');
    }
  };

  const handleStatusChange = async (userId: string, status: string) => {
    try {
      const res = await api.patch(`/admin/employees/${userId}/status`, { status });
      if (res.data.success) {
        addToast('Status Changed', res.data.message, 'info');
        fetchEmployees();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to update status', 'danger');
    }
  };

  // Filter employees
  const query = (searchQuery || localSearch).toLowerCase().trim();
  const filtered = employees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(query) ||
      e.email.toLowerCase().includes(query) ||
      e.employeeCode.toLowerCase().includes(query) ||
      e.designation.toLowerCase().includes(query);

    if (!matchSearch) return false;

    if (activeSubTab === 'ACTIVE') return ['ACTIVE', 'PROBATION'].includes(e.status);
    if (activeSubTab === 'INVITED') return e.status === 'INVITED';
    if (activeSubTab === 'SUSPENDED') return ['SUSPENDED', 'TERMINATED', 'EXITED'].includes(e.status);
    return true;
  });

  const activeCount = employees.filter(e => ['ACTIVE', 'PROBATION'].includes(e.status)).length;
  const invitedCount = employees.filter(e => e.status === 'INVITED').length;
  const suspendedCount = employees.filter(e => ['SUSPENDED', 'TERMINATED', 'EXITED'].includes(e.status)).length;

  const paginatedEmployees = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      
      {/* Top Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Employee Operations & Lifecycle Directory</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              {employees.length} Total
            </span>
          </h2>
          <p className="text-xs text-slate-500">Invite management, role assignment, and organization roster</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs transition"
          >
            <UploadCloud className="w-4 h-4 text-slate-500" />
            <span>Bulk CSV Import</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-500/20 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => { setActiveSubTab('ACTIVE'); setCurrentPage(1); }}
          className={`p-4 rounded-xl border text-left transition ${
            activeSubTab === 'ACTIVE'
              ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active & Probation</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-2 font-mono-num">
            {activeCount}
          </div>
        </button>

        <button
          onClick={() => { setActiveSubTab('INVITED'); setCurrentPage(1); }}
          className={`p-4 rounded-xl border text-left transition ${
            activeSubTab === 'INVITED'
              ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Invites</span>
            <Mail className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-2 font-mono-num">
            {invitedCount}
          </div>
        </button>

        <button
          onClick={() => { setActiveSubTab('SUSPENDED'); setCurrentPage(1); }}
          className={`p-4 rounded-xl border text-left transition ${
            activeSubTab === 'SUSPENDED'
              ? 'bg-rose-50/50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700 shadow-xs'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Suspended / Exited</span>
            <Shield className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mt-2 font-mono-num">
            {suspendedCount}
          </div>
        </button>
      </div>

      {/* Directory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        
        {/* Table Search & Filter Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Filter by name, email, code..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <span className="text-xs text-slate-400">
            Showing {filtered.length} employees in <strong>{activeSubTab}</strong> state
          </span>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3">Employee</th>
                <th className="px-5 py-3">Department & Role</th>
                <th className="px-5 py-3">Reporting Manager</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">Loading directory...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">No employees found in this view.</td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center font-bold text-xs text-indigo-700 dark:text-indigo-300">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <button
                            onClick={() => handleOpen360(emp.id)}
                            className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 block text-left transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{emp.name}</span>
                            <Sparkles className="w-3 h-3 text-amber-500" />
                          </button>
                          <span className="text-[11px] text-slate-400 font-mono">{emp.employeeCode} · {emp.email}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{emp.designation}</span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{emp.department}</span>
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-3.5 text-slate-600 dark:text-slate-300 font-medium">
                      {emp.reportingManager}
                    </td>

                    <td className="px-5 py-3.5">
                      {emp.status === 'ACTIVE' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          ACTIVE
                        </span>
                      )}
                      {emp.status === 'PROBATION' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                          PROBATION
                        </span>
                      )}
                      {emp.status === 'INVITED' && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          INVITE PENDING
                        </span>
                      )}
                      {['SUSPENDED', 'TERMINATED', 'EXITED'].includes(emp.status) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          {emp.status}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpen360(emp.id)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 rounded-md flex items-center gap-1 transition cursor-pointer"
                          title="View Employee Profile Dossier"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-500" />
                          <span>Profile Dossier</span>
                        </button>
                        {emp.status === 'INVITED' ? (
                          <button
                            onClick={() => handleResendInvite(emp.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md flex items-center gap-1 transition"
                            title="Resend 72h Invite Link"
                          >
                            <RotateCw className="w-3 h-3" />
                            <span>Resend</span>
                          </button>
                        ) : emp.status === 'ACTIVE' ? (
                          <button
                            onClick={() => handleStatusChange(emp.id, 'SUSPENDED')}
                            className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(emp.id, 'ACTIVE')}
                            className="px-2 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded transition"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Directory Pagination Controls (10, 25, 50, 100) */}
        <div className="px-5 pb-5">
          <PaginationControls
            currentPage={currentPage}
            pageSize={pageSize}
            totalEntries={filtered.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>

      </div>

      {/* Modals & Drawers */}
      <EmployeeDetailDrawer
        userId={selected360EmployeeId}
        isOpen={!!selected360EmployeeId}
        onClose={handleClose360}
      />

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchEmployees}
      />

      <BulkImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={fetchEmployees}
      />

    </div>
  );
};
