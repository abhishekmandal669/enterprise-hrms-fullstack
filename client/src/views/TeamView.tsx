import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Sparkles } from 'lucide-react';
import { EmployeeDetailDrawer } from '../components/EmployeeDetailDrawer';
import { PaginationControls } from '../components/PaginationControls';

export const TeamView: React.FC = () => {
  const { socket } = useSocket();
  const [team, setTeam] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  // Pagination states (10, 25, 50, 100)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const res = await api.get('/attendance/team-roster');
      if (res.data.success) {
        setTeam(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch team roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('attendance:live_update', () => fetchTeam());
  }, [socket]);

  // Aggregate Metrics
  const totalCount = team.length;
  const presentCount = team.filter(m => m.status === 'PRESENT' || m.status === 'LATE' || m.status === 'ON_BREAK').length;
  const lateCount = team.filter(m => m.status === 'LATE').length;
  const breakCount = team.filter(m => m.status === 'ON_BREAK').length;
  const absentCount = team.filter(m => m.status === 'ABSENT' || m.status === 'NOT_CLOCKED_IN').length;

  const filteredTeam = team.filter(m => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'PRESENT') return m.status === 'PRESENT';
    if (filterStatus === 'LATE') return m.status === 'LATE';
    if (filterStatus === 'ON_BREAK') return m.status === 'ON_BREAK';
    if (filterStatus === 'ABSENT') return m.status === 'ABSENT' || m.status === 'NOT_CLOCKED_IN';
    return true;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus]);

  const paginatedTeam = filteredTeam.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">Team Roster & Shift Status</h2>
        <p className="text-xs text-slate-500">Live presence matrix for direct reportees under your supervision</p>
      </div>

      {/* KPI Presence Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Team Present</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{presentCount}/{totalCount}</span>
            <span className="text-xs text-slate-400">({totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0}%)</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Late Arrivals</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400">{lateCount}</span>
            <span className="text-xs text-amber-500 font-semibold">Infractions</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">On Active Break</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-purple-600 dark:text-purple-400">{breakCount}</span>
            <span className="text-xs text-slate-400">Members</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 block uppercase">Yet to Punch</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-xl font-black text-rose-600 dark:text-rose-400">{absentCount}</span>
            <span className="text-xs text-rose-400">Pending</span>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
        
        {/* Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1 rounded-md transition ${filterStatus === 'ALL' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400'}`}
            >
              All ({team.length})
            </button>
            <button
              onClick={() => setFilterStatus('PRESENT')}
              className={`px-3 py-1 rounded-md transition ${filterStatus === 'PRESENT' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Present
            </button>
            <button
              onClick={() => setFilterStatus('LATE')}
              className={`px-3 py-1 rounded-md transition ${filterStatus === 'LATE' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Late (⚠ {lateCount})
            </button>
            <button
              onClick={() => setFilterStatus('ON_BREAK')}
              className={`px-3 py-1 rounded-md transition ${filterStatus === 'ON_BREAK' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400'}`}
            >
              On Break
            </button>
            <button
              onClick={() => setFilterStatus('ABSENT')}
              className={`px-3 py-1 rounded-md transition ${filterStatus === 'ABSENT' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold' : 'text-slate-600 dark:text-slate-400'}`}
            >
              Yet to Punch
            </button>
          </div>

          <span className="text-xs text-slate-400">
            Shift: <strong className="text-slate-700 dark:text-slate-300">09:00 - 18:00 (15m Grace)</strong>
          </span>
        </div>

        {/* Roster Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 dark:border-slate-800 uppercase text-[10px]">
                <th className="py-2.5 px-3">Team Member</th>
                <th className="py-2.5 px-3">Designation</th>
                <th className="py-2.5 px-3">Live Presence</th>
                <th className="py-2.5 px-3">Clock-In</th>
                <th className="py-2.5 px-3">Clock-Out</th>
                <th className="py-2.5 px-3">Work Duration</th>
                <th className="py-2.5 px-3">Open Tasks</th>
                <th className="py-2.5 px-3">Work Mode</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">Loading team presence...</td>
                </tr>
              ) : filteredTeam.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">No members matched this filter.</td>
                </tr>
              ) : (
                paginatedTeam.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <img src={m.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                        <button
                          onClick={() => setSelectedEmployeeId(m.id)}
                          className="text-slate-800 dark:text-slate-100 font-semibold hover:text-indigo-600 dark:hover:text-indigo-400 text-left transition flex items-center gap-1.5"
                        >
                          <span>{m.name}</span>
                          <Sparkles className="w-3 h-3 text-amber-500" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{m.role}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === 'PRESENT' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                        m.status === 'LATE' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                        m.status === 'ON_BREAK' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {m.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono-num font-medium">{m.clockIn}</td>
                    <td className="py-3 px-3 font-mono-num">{m.clockOut}</td>
                    <td className="py-3 px-3 font-mono-num font-semibold text-slate-700 dark:text-slate-300">{m.workDuration}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                        {m.openTasks} Tasks
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{m.location}</td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedEmployeeId(m.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 rounded-md inline-flex items-center gap-1 transition"
                        title="View Full 360° Profile & Work History"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        <span>360° View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          currentPage={currentPage}
          pageSize={pageSize}
          totalEntries={filteredTeam.length}
          pageSizeOptions={[10, 25, 50, 100]}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* 360 Employee Detail Drawer */}
      <EmployeeDetailDrawer
        userId={selectedEmployeeId}
        isOpen={!!selectedEmployeeId}
        onClose={() => setSelectedEmployeeId(null)}
      />

    </div>
  );
};
