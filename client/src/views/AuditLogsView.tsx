import React, { useState, useEffect } from 'react';
import {
  Search,
  Loader2,
  FileText
} from 'lucide-react';
import api from '../services/api';
import { PaginationControls } from '../components/PaginationControls';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  
  // Pagination State (10, 25, 50, 100)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });

  const fetchLogs = async (page = currentPage, limit = pageSize) => {
    try {
      setLoading(true);
      let query = `/audit-logs?page=${page}&limit=${limit}`;
      if (selectedAction !== 'ALL') {
        query += `&action=${selectedAction}`;
      }
      const res = await api.get(query);
      if (res.data.success) {
        setLogs(res.data.data.logs);
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchLogs(1, pageSize);
  }, [selectedAction]);

  const filteredLogs = logs.filter(log => {
    const q = search.toLowerCase();
    const actorName = log.actor ? `${log.actor.firstName} ${log.actor.lastName} ${log.actor.email}`.toLowerCase() : '';
    const action = (log.action || '').toLowerCase();
    const resource = (log.resourceType || '').toLowerCase();
    return actorName.includes(q) || action.includes(q) || resource.includes(q);
  });

  const getActionBadge = (action: string) => {
    if (action.includes('CREATE') || action.includes('ADD')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          {action}
        </span>
      );
    }
    if (action.includes('DELETE') || action.includes('REMOVE') || action.includes('TERMINATE')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
          {action}
        </span>
      );
    }
    if (action.includes('UPDATE') || action.includes('EDIT') || action.includes('STATUS')) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          {action}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
        {action}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>System Audit Trail & Governance Logs</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Security Compliance
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all user lifecycle events, administrative mutations, and approvals.
          </p>
        </div>

        <span className="text-xs text-slate-400 font-mono-num">
          Total Recorded Events: <strong>{pagination.total}</strong>
        </span>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor name, action, or resource..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
          >
            <option value="ALL">All Event Actions</option>
            <option value="EMPLOYEE_CREATE">Employee Create</option>
            <option value="EMPLOYEE_STATUS_UPDATE">Status Update</option>
            <option value="INVITE_RESEND">Invite Resend</option>
            <option value="EMPLOYEE_BULK_IMPORT">Bulk CSV Import</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
          <span>Loading audit trail...</span>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-16 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <FileText className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
          <p className="font-bold text-slate-700 dark:text-slate-300">No audit events match filters</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Action Event</th>
                  <th className="py-3.5 px-4">Target Resource</th>
                  <th className="py-3.5 px-4">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono-num text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.actor ? (
                        <div>
                          <strong className="block text-slate-900 dark:text-white">
                            {log.actor.firstName} {log.actor.lastName}
                          </strong>
                          <span className="text-[10px] text-slate-400 block">{log.actor.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">System / Daemon</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {log.resourceType} {log.resourceId ? `(${log.resourceId.slice(0, 8)}...)` : ''}
                    </td>
                    <td className="py-3 px-4 font-mono-num text-slate-400">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls
            currentPage={currentPage}
            pageSize={pageSize}
            totalEntries={search ? filteredLogs.length : pagination.total}
            pageSizeOptions={[10, 25, 50, 100]}
            onPageChange={(page) => {
              setCurrentPage(page);
              fetchLogs(page, pageSize);
            }}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
              fetchLogs(1, newSize);
            }}
          />
        </div>
      )}
    </div>
  );
};
