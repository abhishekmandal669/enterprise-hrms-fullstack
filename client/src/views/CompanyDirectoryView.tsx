import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Users, Search, Building2, Mail, Network
} from 'lucide-react';
import { PaginationControls } from '../components/PaginationControls';

interface EmployeeItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  designation: string;
  avatarUrl?: string | null;
  department?: {
    id: string;
    name: string;
    code: string;
  } | null;
  reportingManager?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    designation: string;
    avatarUrl?: string | null;
  } | null;
}

export const CompanyDirectoryView: React.FC = () => {
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'ROSTER' | 'ORG_CHART'>('ROSTER');

  // Pagination State (10, 25, 50, 100)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchDirectory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/employees/directory');
      if (res.data.success) {
        setEmployees(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load company directory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectory();
  }, []);

  // Department list
  const departments = Array.from(
    new Set(employees.map(e => e.department?.name).filter(Boolean))
  ) as string[];

  // Filtered employees
  const filteredEmployees = employees.filter(e => {
    const q = searchQuery.toLowerCase().trim();
    const fullName = `${e.firstName} ${e.lastName}`.toLowerCase();
    const matchSearch =
      !q ||
      fullName.includes(q) ||
      e.email.toLowerCase().includes(q) ||
      e.designation.toLowerCase().includes(q) ||
      e.employeeCode.toLowerCase().includes(q);

    const matchDept = selectedDept === 'ALL' || e.department?.name === selectedDept;

    return matchSearch && matchDept;
  });

  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Root employees (those without reporting manager or top level)
  const rootEmployees = employees.filter(e => !e.reportingManager || !employees.some(m => m.id === e.reportingManager?.id));

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">Leadership</span>;
      case 'HR_ADMIN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">HR Admin</span>;
      case 'MANAGER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Manager</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">Staff</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>Company Directory & Org Chart</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold">
              Read Only
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Browse all colleagues, designations, departments, and reporting lines across Nexus.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl w-fit">
          <button
            onClick={() => setActiveSubTab('ROSTER')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'ROSTER'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Directory Roster ({employees.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('ORG_CHART')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeSubTab === 'ORG_CHART'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Hierarchical Org Chart</span>
          </button>
        </div>
      </div>

      {/* ── Search & Filter Strip ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, designation, email, or employee code..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Department:</span>
          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700 dark:text-slate-200"
          >
            <option value="ALL">All Departments</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Content View ── */}
      {loading ? (
        <div className="py-24 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          Loading company directory...
        </div>
      ) : activeSubTab === 'ROSTER' ? (
        /* ── Roster Grid & Pagination ── */
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredEmployees.length === 0 ? (
              <div className="col-span-full py-16 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                No employees match your search criteria.
              </div>
            ) : (
              paginatedEmployees.map(emp => (
                <div
                  key={emp.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between space-y-3"
                >
                  {/* Header: Avatar + Role */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="relative">
                      <img
                        src={emp.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.firstName + ' ' + emp.lastName)}&background=6366f1&color=fff`}
                        alt=""
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                    </div>
                    {getRoleBadge(emp.role)}
                  </div>

                  {/* Name & Designation */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {emp.firstName} {emp.lastName}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {emp.designation}
                    </p>
                    <span className="text-[10px] font-mono-num text-slate-400 mt-1 inline-block">
                      {emp.employeeCode}
                    </span>
                  </div>

                  {/* Department & Email */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{emp.department?.name || 'General Org'}</span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <a
                        href={`mailto:${emp.email}`}
                        className="truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        title={emp.email}
                      >
                        {emp.email}
                      </a>
                    </div>
                  </div>

                  {/* Reporting Manager */}
                  {emp.reportingManager && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[11px] text-slate-400">
                      <span>Reports to:</span>
                      <strong className="text-slate-700 dark:text-slate-300 truncate">
                        {emp.reportingManager.firstName} {emp.reportingManager.lastName}
                      </strong>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Directory Pagination Controls (10, 25, 50, 100) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSize}
              totalEntries={filteredEmployees.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>
      ) : (
        /* ── Hierarchical Org Chart View ── */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Organization Hierarchy</h3>
              <p className="text-xs text-slate-400">Reporting trees organized by leadership and reporting managers.</p>
            </div>
          </div>

          <div className="space-y-6">
            {rootEmployees.map(root => {
              const reportees = employees.filter(e => e.reportingManager?.id === root.id);

              return (
                <div
                  key={root.id}
                  className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4"
                >
                  {/* Manager / Root Node */}
                  <div className="flex items-center gap-3">
                    <img
                      src={root.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(root.firstName + ' ' + root.lastName)}&background=6366f1&color=fff`}
                      alt=""
                      className="w-10 h-10 rounded-2xl object-cover border border-slate-300 dark:border-slate-600 shadow-2xs"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {root.firstName} {root.lastName}
                        </h4>
                        {getRoleBadge(root.role)}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {root.designation} • {root.department?.name || 'Leadership'}
                      </p>
                    </div>
                  </div>

                  {/* Direct Reportees */}
                  {reportees.length > 0 && (
                    <div className="pl-6 border-l-2 border-indigo-300 dark:border-indigo-800 space-y-3 mt-3 ml-5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Direct Reports ({reportees.length})
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {reportees.map(child => {
                          const grandChildren = employees.filter(e => e.reportingManager?.id === child.id);

                          return (
                            <div
                              key={child.id}
                              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs space-y-1.5"
                            >
                              <div className="flex items-center gap-2.5">
                                <img
                                  src={child.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(child.firstName + ' ' + child.lastName)}&background=6366f1&color=fff`}
                                  alt=""
                                  className="w-8 h-8 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                                />
                                <div className="min-w-0 flex-1">
                                  <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                    {child.firstName} {child.lastName}
                                  </h5>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {child.designation}
                                  </p>
                                </div>
                              </div>
                              {grandChildren.length > 0 && (
                                <p className="text-[10px] text-indigo-500 font-semibold pt-1 border-t border-slate-100 dark:border-slate-800">
                                  Manages {grandChildren.length} team members
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
