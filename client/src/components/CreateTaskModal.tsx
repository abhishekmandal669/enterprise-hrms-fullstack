import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  X, CheckSquare, Briefcase, Users, Calendar,
  FolderPlus, Search, UserCheck, Check, Sparkles,
  ArrowLeft, ChevronRight
} from 'lucide-react';
import { CustomSelect } from './CustomSelect';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { addToast } = useSocket();

  // Task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);
  
  // Data lists
  const [projects, setProjects] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Add Project inline modal state
  const [showNewProjectInput, setShowNewProjectInput] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCode, setNewProjectCode] = useState('');
  const [newProjectClient, setNewProjectClient] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/timesheets/projects');
      if (res.data.success) {
        setProjects(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const endpoint = (user?.role === 'ADMIN' || user?.role === 'HR_ADMIN')
        ? '/admin/employees?limit=100'
        : '/attendance/team-roster';
      const res = await api.get(endpoint);
      if (res.data.success) {
        setTeamMembers(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load team members:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
      fetchTeamMembers();
      if (user?.id && assignedUserIds.length === 0) {
        setAssignedUserIds([user.id]);
      }
    }
  }, [isOpen, user?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggleAssignee = (userId: string) => {
    if (user?.role === 'EMPLOYEE' && userId !== user.id) {
      addToast('Role Restricted', 'Employees can only assign personal tasks to themselves.', 'warning');
      return;
    }

    setAssignedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllTeam = () => {
    if (user?.role === 'EMPLOYEE') return;
    const allIds = teamMembers.map(m => m.id);
    if (user?.id && !allIds.includes(user.id)) allIds.push(user.id);
    setAssignedUserIds(allIds);
  };

  const handleClearAssignees = () => {
    setAssignedUserIds(user?.id ? [user.id] : []);
  };

  const handleQuickCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName || !newProjectCode) {
      addToast('Validation Error', 'Project name and code are required.', 'warning');
      return;
    }

    try {
      setIsCreatingProject(true);
      const res = await api.post('/timesheets/projects', {
        name: newProjectName,
        code: newProjectCode.toUpperCase(),
        clientName: newProjectClient || undefined
      });

      if (res.data.success) {
        addToast('Project Created', `Project ${newProjectName} added successfully.`, 'success');
        await fetchProjects();
        setProjectId(res.data.data.id);
        setShowNewProjectInput(false);
        setNewProjectName('');
        setNewProjectCode('');
        setNewProjectClient('');
      }
    } catch (err: any) {
      addToast('Error', err.response?.data?.message || 'Failed to create project.', 'danger');
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      addToast('Validation Error', 'Task title is required.', 'warning');
      return;
    }

    if (assignedUserIds.length === 0) {
      addToast('Validation Error', 'Please select at least one assignee.', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/tasks', {
        title,
        description,
        projectId: projectId || undefined,
        priority,
        dueDate: dueDate || undefined,
        assignedUserIds
      });

      if (res.data.success) {
        addToast('Task Created', res.data.message, 'success');
        onSuccess();
        onClose();
        setTitle('');
        setDescription('');
        setDueDate('');
        setProjectId('');
        setAssignedUserIds(user?.id ? [user.id] : []);
      }
    } catch (err: any) {
      addToast('Creation Failed', err.response?.data?.message || 'Failed to create task.', 'danger');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMembers = teamMembers.filter(m => {
    const q = memberSearch.toLowerCase();
    const name = m.name || `${m.firstName || ''} ${m.lastName || ''}`.trim();
    const role = m.role || m.designation || '';
    return name.toLowerCase().includes(q) || role.toLowerCase().includes(q);
  });

  const setPresetDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    setDueDate(d.toISOString().split('T')[0]);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-slate-50 dark:bg-slate-950 flex flex-col w-screen h-screen overflow-hidden animate-in fade-in duration-200">
      
      {/* Full Page Navigation Header */}
      <header className="shrink-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 sm:px-8 flex items-center justify-between z-20 shadow-xs">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Tasks & Projects</span>
          </button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className="text-slate-400">Tasks</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">New Deliverable</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 rounded-full text-xs text-indigo-700 dark:text-indigo-300 font-medium">
            <Users className="w-3.5 h-3.5" />
            <span>{assignedUserIds.length} Assignee{assignedUserIds.length !== 1 ? 's' : ''} Selected</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Workspace Form */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full px-6 py-8 space-y-8">
            
            {/* Hero Title Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-400 flex items-center justify-center font-bold shadow-inner">
                  <CheckSquare className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Create & Assign Project Deliverable</h1>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Full Page Workspace
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-indigo-200/70 mt-1">
                    Delegate tasks to multiple team members linked with active enterprise projects and sprint milestones
                  </p>
                </div>
              </div>
            </div>

            {/* 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left / Main Column (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
            
            {/* Task Title */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                Task Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Implement OAuth 2.0 Auth Flow & Multi-tenant RBAC"
                required
                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
              />
            </div>

            {/* Project Selection & Quick Add */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Associated Project</span>
                </label>
                {(user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') && (
                  <button
                    type="button"
                    onClick={() => setShowNewProjectInput(prev => !prev)}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    <span>{showNewProjectInput ? 'Hide Project Form' : '+ New Project'}</span>
                  </button>
                )}
              </div>

              {/* Inline Quick Project Add Form */}
              {showNewProjectInput && (
                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-xl space-y-2.5 animate-in fade-in">
                  <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 block">Create Enterprise Project</span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Project Name (e.g. AI HRMS)"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="Code (e.g. PRJ-AI-05)"
                      value={newProjectCode}
                      onChange={(e) => setNewProjectCode(e.target.value)}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 uppercase"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Client Name (Optional)"
                      value={newProjectClient}
                      onChange={(e) => setNewProjectClient(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={handleQuickCreateProject}
                      disabled={isCreatingProject}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50"
                    >
                      {isCreatingProject ? 'Saving...' : 'Save Project'}
                    </button>
                  </div>
                </div>
              )}

              <CustomSelect
                value={projectId}
                onChange={(val) => setProjectId(val)}
                placeholder="Select project..."
                options={[
                  { value: '', label: 'General / Internal Initiative (No Project)' },
                  ...projects.map((p) => ({
                    value: p.id,
                    label: `[${p.code}] ${p.name}`,
                    sublabel: p.clientName ? `Client: ${p.clientName}` : undefined,
                    badge: p.code,
                    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                  }))
                ]}
              />
            </div>

            {/* Description & Repro Steps */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5">
                Description & Deliverable Scope
              </label>
              <textarea
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail technical requirements, acceptance criteria, test scenarios, or API contracts..."
                className="w-full px-4 py-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 leading-relaxed font-sans"
              />
            </div>

            {/* Priority Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-2">
                Priority Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'LOW', label: 'Low', color: 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300' },
                  { id: 'MEDIUM', label: 'Medium', color: 'border-indigo-300 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' },
                  { id: 'HIGH', label: 'High', color: 'border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400' },
                  { id: 'URGENT', label: '🚨 Urgent', color: 'border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPriority(p.id)}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition text-center ${
                      priority === p.id
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30'
                        : `bg-slate-50 dark:bg-slate-800/50 ${p.color} hover:bg-slate-100 dark:hover:bg-slate-800`
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column (5 cols): Multi-Assignees & Timeline */}
          <div className="lg:col-span-5 space-y-5 bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 flex flex-col justify-between">
            
            <div className="space-y-4">
              
              {/* Due Date & Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Due Date Timeline</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-medium"
                />
                
                {/* Quick Date Presets */}
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-semibold">Presets:</span>
                  <button
                    type="button"
                    onClick={() => setPresetDate(0)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDate(1)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDate(3)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetDate(7)}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300"
                  >
                    Next Week
                  </button>
                </div>
              </div>

              {/* Multi-Assignee Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Assignees ({assignedUserIds.length})</span>
                  </label>

                  {user?.role !== 'EMPLOYEE' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllTeam}
                        className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Select All
                      </button>
                      <span>&bull;</span>
                      <button
                        type="button"
                        onClick={handleClearAssignees}
                        className="text-[10px] font-bold text-slate-400 hover:underline"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>

                {/* Selected Assignees Chips */}
                {assignedUserIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl min-h-[38px]">
                    {assignedUserIds.map(id => {
                      const member = teamMembers.find(m => m.id === id);
                      const isMe = id === user?.id;
                      const displayName = isMe ? `${user?.name} (You)` : (member?.name || `${member?.firstName} ${member?.lastName}`);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                        >
                          <UserCheck className="w-3 h-3 text-indigo-500" />
                          <span>{displayName}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleAssignee(id)}
                            className="text-slate-400 hover:text-rose-500 transition ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Search members if Manager / Admin */}
                {user?.role !== 'EMPLOYEE' && (
                  <>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search team member by name..."
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400"
                      />
                    </div>

                    {/* Member Selection Scrollable List */}
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-slate-800/60">
                      {/* Self Option */}
                      {user && (
                        <div
                          onClick={() => handleToggleAssignee(user.id)}
                          className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition ${
                            assignedUserIds.includes(user.id)
                              ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800'
                              : 'hover:bg-white dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                              {user.name.charAt(0)}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                                {user.name} <span className="text-[10px] text-indigo-500">(You)</span>
                              </span>
                              <span className="text-[10px] text-slate-400">{user.designation}</span>
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition ${
                            assignedUserIds.includes(user.id)
                              ? 'bg-indigo-600 border-indigo-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {assignedUserIds.includes(user.id) && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                      )}

                      {filteredMembers.map(m => {
                        if (m.id === user?.id) return null;
                        const isSelected = assignedUserIds.includes(m.id);
                        const memberName = m.name || `${m.firstName} ${m.lastName}`;
                        const memberRole = m.role || m.designation || 'Team Member';
                        return (
                          <div
                            key={m.id}
                            onClick={() => handleToggleAssignee(m.id)}
                            className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition ${
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800'
                                : 'hover:bg-white dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {m.avatar || m.avatarUrl ? (
                                <img src={m.avatar || m.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">
                                  {memberName.charAt(0)}
                                </div>
                              )}
                              <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-white block leading-tight">
                                  {memberName}
                                </span>
                                <span className="text-[10px] text-slate-400">{memberRole}</span>
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {user?.role === 'EMPLOYEE' && (
                  <div className="p-2.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900 text-xs text-indigo-700 dark:text-indigo-300">
                    <span className="font-semibold block">Personal Self-Assigned Task</span>
                    <span className="text-[11px] text-slate-500">Tasks created under employee role are assigned to your own workspace.</span>
                  </div>
                )}
              </div>

            </div>

          </div>

          </div>

          {/* Sticky Action Footer */}
          <div className="sticky bottom-6 z-30 p-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xl flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              Cancel & Return
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/30 transition transform active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isSubmitting ? 'Creating Deliverable...' : 'Create & Assign Task'}</span>
            </button>
          </div>

        </div>
      </div>
    </form>
  </div>,
  document.body
);
};
