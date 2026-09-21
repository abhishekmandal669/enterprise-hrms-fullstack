import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Plus, Bell, CheckCircle2, AlertTriangle, Radio } from 'lucide-react';
import { PaginationControls } from '../components/PaginationControls';

interface BroadcastsViewProps {
  onOpenCreateBroadcast: () => void;
}

export const BroadcastsView: React.FC<BroadcastsViewProps> = ({ onOpenCreateBroadcast }) => {
  const { user } = useAuth();
  const { addToast, socket } = useSocket();
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination states (10, 25, 50, 100)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/broadcasts');
      if (res.data.success) {
        setBroadcasts(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load broadcasts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('broadcast:new', () => fetchBroadcasts());
  }, [socket]);

  const handleAcknowledge = (id: string) => {
    setAcknowledgedIds(prev => [...prev, id]);
    addToast('Broadcast Acknowledged', 'Your acknowledgment has been logged for HR compliance.', 'success');
  };

  const paginatedBroadcasts = broadcasts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Corporate Announcements Hub</h2>
          <p className="text-xs text-slate-500">Official company notices, policy updates, and emergency broadcasts</p>
        </div>
        {user?.role === 'ADMIN' && (
          <button
            onClick={onOpenCreateBroadcast}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Broadcast</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-xs text-slate-400">Loading company announcements...</div>
        ) : broadcasts.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-2">
            <Radio className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Active Announcements</h3>
            <p className="text-xs text-slate-400">All company communications are up to date.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedBroadcasts.map(b => {
                const isUrgent = b.priority === 'URGENT';
                const isAcked = acknowledgedIds.includes(b.id);

                return (
                  <div
                    key={b.id}
                    className={`bg-white dark:bg-slate-900 border ${
                      isUrgent
                        ? 'border-rose-300 dark:border-rose-900/60 ring-1 ring-rose-400/20'
                        : 'border-slate-200 dark:border-slate-800'
                    } rounded-xl p-5 shadow-xs transition`}
                  >
                    <div className="flex items-start justify-between gap-3 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        {isUrgent ? (
                          <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
                        ) : (
                          <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        )}
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{b.title}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isUrgent
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        }`}>
                          {b.priority}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Target: {b.targetType}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4 whitespace-pre-line">
                      {b.content}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
                      <div>
                        Published by <strong className="text-slate-700 dark:text-slate-300">{b.sender?.firstName} {b.sender?.lastName}</strong> &bull; {new Date(b.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>

                      <div>
                        {isAcked ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Acknowledged
                          </span>
                        ) : (
                          <button
                            onClick={() => handleAcknowledge(b.id)}
                            className="px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition"
                          >
                            Acknowledge Notice
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <PaginationControls
                currentPage={currentPage}
                pageSize={pageSize}
                totalEntries={broadcasts.length}
                pageSizeOptions={[10, 25, 50, 100]}
                onPageChange={setCurrentPage}
                onPageSizeChange={(newSize) => {
                  setPageSize(newSize);
                  setCurrentPage(1);
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
