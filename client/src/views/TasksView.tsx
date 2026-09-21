import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Plus, CheckSquare, Clock, Trash2, Briefcase } from 'lucide-react';

interface TasksViewProps {
  onOpenCreateTask: () => void;
  searchQuery: string;
}

export const TasksView: React.FC<TasksViewProps> = ({ onOpenCreateTask, searchQuery }) => {
  const { user } = useAuth();
  const { addToast, socket } = useSocket();
  const [tasks, setTasks] = useState<any[]>([]);
  const [filterMode, setFilterMode] = useState<'ALL' | 'ASSIGNED_TO_ME' | 'CREATED_BY_ME'>('ALL');

  const fetchTasks = async () => {
    try {
      const endpoint = (user?.role === 'MANAGER' || user?.role === 'ADMIN') ? '/tasks/team' : '/tasks/me';
      const res = await api.get(endpoint);
      if (res.data.success) {
        setTasks(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user?.role]);

  useEffect(() => {
    if (!socket) return;
    socket.on('tasks:updated', () => fetchTasks());
  }, [socket]);

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      if (res.data.success) {
        addToast('Status Updated', res.data.message, 'success');
        fetchTasks();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to update status', 'danger');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await api.delete(`/tasks/${taskId}`);
      if (res.data.success) {
        addToast('Task Removed', 'Task deleted successfully.', 'info');
        fetchTasks();
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to delete task', 'danger');
    }
  };

  // Filter tasks based on mode & global search query
  const filteredTasks = tasks.filter(t => {
    const q = searchQuery.toLowerCase();
    const titleMatch = t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
    const projectName = t.project ? `${t.project.name} ${t.project.code}`.toLowerCase() : '';
    const projectMatch = projectName.includes(q);
    const assigneeMatch = `${t.assignedTo?.firstName} ${t.assignedTo?.lastName}`.toLowerCase().includes(q);
    const multiAssigneeMatch = t.assignees?.some((a: any) =>
      `${a.user?.firstName} ${a.user?.lastName}`.toLowerCase().includes(q)
    );

    if (!titleMatch && !projectMatch && !assigneeMatch && !multiAssigneeMatch) return false;

    if (filterMode === 'ASSIGNED_TO_ME') {
      return t.assignedToId === user?.id || t.assignees?.some((a: any) => a.userId === user?.id);
    }
    if (filterMode === 'CREATED_BY_ME') return t.createdById === user?.id;
    return true;
  });

  const todoTasks = filteredTasks.filter(t => t.status === 'TODO');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'IN_PROGRESS');
  const doneTasks = filteredTasks.filter(t => t.status === 'DONE');

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400">URGENT</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">MEDIUM</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">LOW</span>;
    }
  };

  const renderTaskCard = (task: any) => {
    const isOwner = task.createdById === user?.id || user?.role === 'ADMIN';
    const assigneesList = task.assignees && task.assignees.length > 0
      ? task.assignees
      : [{ user: task.assignedTo }];

    return (
      <div
        key={task.id}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition group space-y-2.5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {getPriorityBadge(task.priority)}
            {task.project && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80">
                <Briefcase className="w-2.5 h-2.5" />
                <span className="truncate max-w-[120px]">{task.project.code}</span>
              </span>
            )}
          </div>
          {isOwner && (
            <button
              onClick={() => handleDeleteTask(task.id)}
              className="text-slate-300 hover:text-rose-500 transition p-0.5 shrink-0"
              title="Delete Task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
          {task.title}
        </h4>

        {task.description && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-400">
          {/* Multi-Assignees Avatar Stack */}
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1.5 overflow-hidden">
              {assigneesList.slice(0, 3).map((a: any, idx: number) => (
                <img
                  key={idx}
                  src={a.user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'}
                  alt=""
                  title={`${a.user?.firstName || ''} ${a.user?.lastName || ''}`}
                  className="inline-block w-5 h-5 rounded-full ring-2 ring-white dark:ring-slate-900 object-cover"
                />
              ))}
            </div>
            {assigneesList.length > 3 && (
              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1 rounded-full">
                +{assigneesList.length - 3}
              </span>
            )}
            <span className="truncate max-w-[90px] font-medium text-slate-700 dark:text-slate-300 ml-0.5">
              {assigneesList[0]?.user?.firstName} {assigneesList.length > 1 ? `+${assigneesList.length - 1}` : ''}
            </span>
          </div>

          {task.dueDate && (
            <div className="flex items-center gap-1 font-mono-num font-medium">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{task.dueDate}</span>
            </div>
          )}
        </div>

        {/* State Advancement Buttons */}
        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          {task.status === 'TODO' && (
            <button
              onClick={() => handleUpdateStatus(task.id, 'IN_PROGRESS')}
              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold transition"
            >
              Start Work &rarr;
            </button>
          )}

          {task.status === 'IN_PROGRESS' && (
            <button
              onClick={() => handleUpdateStatus(task.id, 'DONE')}
              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950 dark:hover:bg-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold transition flex items-center gap-1"
            >
              <span>Mark Done</span>
              <CheckSquare className="w-3 h-3" />
            </button>
          )}

          {task.status === 'DONE' && (
            <button
              onClick={() => handleUpdateStatus(task.id, 'TODO')}
              className="text-[10px] text-slate-400 hover:underline font-semibold"
            >
              Reopen
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Task Tracking & Operational Board</h2>
          <p className="text-xs text-slate-500">Self-tasks, team deliverables delegation, and live progress state</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700 rounded-lg">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${filterMode === 'ALL' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'}`}
            >
              All Tasks
            </button>
            <button
              onClick={() => setFilterMode('ASSIGNED_TO_ME')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${filterMode === 'ASSIGNED_TO_ME' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'}`}
            >
              Assigned to Me
            </button>
            <button
              onClick={() => setFilterMode('CREATED_BY_ME')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${filterMode === 'CREATED_BY_ME' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-slate-500'}`}
            >
              Created by Me
            </button>
          </div>

          <button
            onClick={onOpenCreateTask}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* 3-Column Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Column 1: To Do */}
        <div className="bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                To Do
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {todoTasks.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {todoTasks.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">No pending tasks.</div>
            ) : (
              todoTasks.map(renderTaskCard)
            )}
          </div>
        </div>

        {/* Column 2: In Progress */}
        <div className="bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                In Progress
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {inProgressTasks.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {inProgressTasks.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">No tasks currently in progress.</div>
            ) : (
              inProgressTasks.map(renderTaskCard)
            )}
          </div>
        </div>

        {/* Column 3: Done */}
        <div className="bg-slate-100/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Completed
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {doneTasks.length}
            </span>
          </div>

          <div className="space-y-3 min-h-[300px]">
            {doneTasks.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">No completed tasks.</div>
            ) : (
              doneTasks.map(renderTaskCard)
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
