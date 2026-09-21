import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Clock,
  User,
  Loader2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import api from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { TaskItem } from '../../types';

interface TaskKanbanViewProps {
  onOpenCreateTask?: () => void;
}

export const TaskKanbanView: React.FC<TaskKanbanViewProps> = ({ onOpenCreateTask }) => {
  const { addToast, socket } = useSocket();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tasks');
      if (res.data.success) {
        setTasks(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load team tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('task:assigned', () => fetchTasks());
    socket.on('task:status_changed', () => fetchTasks());
    return () => {
      socket.off('task:assigned');
      socket.off('task:status_changed');
    };
  }, [socket]);

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      setUpdatingTaskId(taskId);
      const res = await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      if (res.data.success) {
        addToast('Task Moved', `Task status updated to ${newStatus.replace('_', ' ')}.`, 'success');
        fetchTasks();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to move task.', 'danger');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const filteredTasks = tasks.filter(t => {
    const q = search.toLowerCase();
    const titleMatch = t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
    const assigneeMatch = t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}`.toLowerCase().includes(q) : false;
    if (search && !titleMatch && !assigneeMatch) return false;
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    return true;
  });

  const columns = [
    { id: 'TODO', label: 'To Do / Backlog', color: 'border-slate-300 dark:border-slate-700' },
    { id: 'IN_PROGRESS', label: 'In Execution', color: 'border-indigo-400 dark:border-indigo-600' },
    { id: 'BLOCKED', label: 'Blocked / Needs Review', color: 'border-rose-400 dark:border-rose-600' },
    { id: 'DONE', label: 'Done & Verified', color: 'border-emerald-400 dark:border-emerald-600' }
  ];

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">URGENT</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">HIGH</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">LOW</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400">MEDIUM</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-indigo-500" />
            <span>Team Task Operations (Kanban Board)</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Sprint View
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Team workload distribution across statuses with drag-free quick stage transitions.
          </p>
        </div>

        {onOpenCreateTask && (
          <button
            onClick={onOpenCreateTask}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Team Task</span>
          </button>
        )}
      </div>

      {/* Filter Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter tasks by deliverable or assignee..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Kanban Board Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
          <span>Loading sprint board...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {columns.map(col => {
            const colTasks = filteredTasks.filter(t => t.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{col.label}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-2xs font-mono-num">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="p-6 text-center text-[11px] text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                      No tasks in this lane
                    </div>
                  ) : (
                    colTasks.map(t => (
                      <div
                        key={t.id}
                        className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-4 shadow-xs space-y-3 hover:border-indigo-300 dark:hover:border-indigo-600 transition group"
                      >
                        <div className="flex items-center justify-between gap-2">
                          {getPriorityBadge(t.priority)}
                          {t.dueDate && (
                            <span className="text-[10px] text-slate-400 font-mono-num flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{t.dueDate}</span>
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                            {t.title}
                          </h4>
                          {t.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                              {t.description}
                            </p>
                          )}
                        </div>

                        {/* Assignee Footer */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <User className="w-3 h-3 text-indigo-500" />
                            <span className="font-semibold truncate max-w-[110px]">
                              {t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : 'Unassigned'}
                            </span>
                          </div>

                          {/* Quick Stage Transitions */}
                          <div className="flex items-center gap-1">
                            {col.id !== 'TODO' && (
                              <button
                                onClick={() => handleUpdateStatus(t.id, col.id === 'DONE' ? 'IN_PROGRESS' : 'TODO')}
                                disabled={updatingTaskId === t.id}
                                className="p-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-indigo-600 transition"
                                title="Move Backward"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                            )}

                            {col.id !== 'DONE' && (
                              <button
                                onClick={() => handleUpdateStatus(t.id, col.id === 'TODO' ? 'IN_PROGRESS' : 'DONE')}
                                disabled={updatingTaskId === t.id}
                                className="p-1 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 hover:text-white transition"
                                title="Move Forward"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
