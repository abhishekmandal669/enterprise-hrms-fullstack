import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Clock,
  CalendarDays,
  CheckSquare,
  Users,
  UserPlus,
  Megaphone,
  FileSpreadsheet,
  Sliders,
  ShieldCheck,
  User,
  Mail,
  Network,
  Banknote,
  UserCheck,
  GraduationCap,
  Laptop,
  FolderArchive,
  FileCheck2,
  Target,
  BarChart3
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingLeavesCount: number;
  unreadMailCount?: number;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  pendingLeavesCount,
  unreadMailCount = 0,
  mobileOpen,
  setMobileOpen
}) => {
  const { user } = useAuth();

  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'HR_ADMIN';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'HR_ADMIN';

  const navItems = [
    // 1. Core Workspace (Daily operational essentials)
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, section: 'CORE WORKSPACE' },
    { id: 'attendance', label: 'Attendance & Clock-In', icon: Clock, section: 'CORE WORKSPACE' },
    { id: 'timesheets', label: 'Timesheets', icon: FileCheck2, section: 'CORE WORKSPACE' },
    { id: 'leaves', label: 'Leave Management', icon: CalendarDays, badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined, section: 'CORE WORKSPACE' },
    { id: 'payroll', label: 'Payroll & Payslips', icon: Banknote, section: 'CORE WORKSPACE' },
    { id: 'training', label: 'Training & Certs', icon: GraduationCap, section: 'CORE WORKSPACE' },
    { id: 'documents', label: 'Document Vault', icon: FolderArchive, section: 'CORE WORKSPACE' },
    { id: 'tasks', label: 'Tasks & Projects', icon: CheckSquare, section: 'CORE WORKSPACE' },
    { id: 'directory', label: 'Company Directory', icon: Network, section: 'CORE WORKSPACE' },

    // 2. Official Communication
    { id: 'webmail', label: 'Company Webmail', icon: Mail, badge: unreadMailCount > 0 ? unreadMailCount : undefined, section: 'COMMUNICATION' },
    { id: 'broadcasts', label: 'Announcements', icon: Megaphone, section: 'COMMUNICATION' },

    // 3. Team & Operations (Managers see Team/Approvals; HR & Admins see full ops)
    ...(isManagerOrAdmin
      ? [
          { id: 'team', label: 'Team Roster', icon: Users, section: 'TEAM & OPERATIONS' },
          { id: 'approvals', label: 'Approval Center', icon: CheckSquare, badge: pendingLeavesCount > 0 ? pendingLeavesCount : undefined, section: 'TEAM & OPERATIONS' }
        ]
      : []),
    ...(isAdmin
      ? [
          { id: 'employees', label: 'Employee Directory', icon: UserPlus, section: 'TEAM & OPERATIONS' },
          { id: 'lifecycle', label: 'Onboarding & Exit', icon: UserCheck, section: 'TEAM & OPERATIONS' },
          { id: 'recruitment', label: 'Recruitment & ATS', icon: Target, section: 'TEAM & OPERATIONS' },
          { id: 'assets', label: 'Asset Management', icon: Laptop, section: 'TEAM & OPERATIONS' },
          { id: 'timesheet-compliance', label: 'Timesheet Compliance', icon: BarChart3, section: 'TEAM & OPERATIONS' }
        ]
      : [
          // Regular Employees and Managers have self-service asset lookup
          { id: 'assets', label: 'My Company Assets', icon: Laptop, section: 'CORE WORKSPACE' }
        ]),

    // 4. Organization & Audit (For Admins / Leadership)
    ...(isAdmin || isManagerOrAdmin
      ? [{ id: 'reports', label: 'Reports & Analytics', icon: FileSpreadsheet, section: 'ORGANIZATION & AUDIT' }]
      : []),
    ...(isAdmin
      ? [{ id: 'policies', label: 'Policies & Shifts', icon: Sliders, section: 'ORGANIZATION & AUDIT' }]
      : []),
    ...(user?.role === 'ADMIN'
      ? [{ id: 'audit-logs', label: 'Audit Logs', icon: ShieldCheck, section: 'ORGANIZATION & AUDIT' }]
      : []),

    // 5. Account
    { id: 'profile', label: 'My Profile', icon: User, section: 'ACCOUNT' }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm shadow-indigo-500/30">
            L
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-slate-900 dark:text-white tracking-tight text-sm leading-tight">
              Lexvera
            </span>
            <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Enterprise HRMS
            </span>
          </div>
        </div>


        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item, idx) => {
            const showSection = idx === 0 || navItems[idx - 1].section !== item.section;
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <React.Fragment key={item.id}>
                {showSection && (
                  <div className="px-3 pt-3.5 pb-1 text-[9.5px] font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase">
                    {item.section}
                  </div>
                )}
                <button
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                      {item.badge}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </nav>

        {/* Profile Footer */}
        <div
          onClick={() => {
            setActiveTab('profile');
            setMobileOpen(false);
          }}
          className={`p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3 cursor-pointer transition ${
            activeTab === 'profile'
              ? 'bg-indigo-50/60 dark:bg-indigo-950/30'
              : 'bg-slate-50/50 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800/50'
          }`}
          title="View My Profile"
        >
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'}
            alt="Avatar"
            className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
          />
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
              {user?.name || 'Loading...'}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              {user?.designation || user?.role}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
