import React, { useState } from 'react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Download, BarChart3, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { CustomReportBuilderModal } from '../components/CustomReportBuilderModal';

export const ReportsView: React.FC = () => {
  const { addToast } = useSocket();
  const [isCustomBuilderOpen, setIsCustomBuilderOpen] = useState(false);

  const handleDownloadAttendance = async () => {
    try {
      const res = await api.get('/reports/attendance/export', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Lexvera_Attendance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Attendance Report Exported', 'Live attendance records exported to CSV.', 'success');
    } catch (err: any) {
      addToast('Export Failed', err.response?.data?.message || 'Could not export attendance CSV.', 'danger');
    }
  };

  const handleDownloadLeaves = async () => {
    try {
      const res = await api.get('/reports/leaves/export', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Lexvera_Leave_Utilization_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Leave Report Exported', 'Live leave records exported to CSV.', 'success');
    } catch (err: any) {
      addToast('Export Failed', err.response?.data?.message || 'Could not export leave CSV.', 'danger');
    }
  };

  const handleDownloadEmployees = async () => {
    try {
      const res = await api.get('/reports/employees/export', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Lexvera_Employee_Directory_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Employee Directory Exported', 'Live employee directory exported to CSV.', 'success');
    } catch (err: any) {
      addToast('Export Failed', err.response?.data?.message || 'Could not export employee CSV.', 'danger');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Audit, Compliance & Export Reports</h2>
          <p className="text-xs text-slate-500">Generate executive CSV timesheets, leave liabilities, and SLA summaries</p>
        </div>

        <button
          onClick={() => setIsCustomBuilderOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Launch Custom Report Builder</span>
        </button>
      </div>

      <CustomReportBuilderModal
        isOpen={isCustomBuilderOpen}
        onClose={() => setIsCustomBuilderOpen(false)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Punctuality & Timesheet Audit */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Executive Attendance Audit</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                94.8% Score
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Consolidated attendance metrics, average working hours (8.4h/day), and shift grace period adherence across departments.
            </p>
          </div>
          <button
            onClick={handleDownloadAttendance}
            className="flex items-center justify-center gap-2 w-full py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Attendance CSV</span>
          </button>
        </div>

        {/* Card 2: Department Leave Utilization */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Leave Utilization Report</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400">
                Live Data
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Breakdown of annual balances across Paid Leave (PL), Casual Leave (CL), and Sick Leave (SL) with carry-forward liability metrics.
            </p>
          </div>
          <button
            onClick={handleDownloadLeaves}
            className="flex items-center justify-center gap-2 w-full py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 rounded-lg transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Leaves CSV</span>
          </button>
        </div>

        {/* Card 3: Employee Directory Export */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Employee Master Roster</h3>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                Full Org
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Complete employee roster export including employee codes, contact numbers, departments, and reporting managers.
            </p>
          </div>
          <button
            onClick={handleDownloadEmployees}
            className="flex items-center justify-center gap-2 w-full py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Employee Directory CSV</span>
          </button>
        </div>

      </div>
    </div>
  );
};
