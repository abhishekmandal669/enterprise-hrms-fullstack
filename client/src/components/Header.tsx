import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useAttendance } from '../context/AttendanceContext';
import { Search, Bell, Sun, Moon, Clock, Menu, LogOut, Play, Square, Coffee } from 'lucide-react';
import { ClockInModal } from './ClockInModal';

interface HeaderProps {
  onOpenNotifications: () => void;
  unreadNotifCount: number;
  onToggleMobileSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNotifications,
  unreadNotifCount,
  onToggleMobileSidebar,
  searchQuery,
  setSearchQuery
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const {
    punchState,
    workSeconds,
    breakSeconds,
    punchLoading,
    formatTimer,
    clockOut,
    toggleBreak
  } = useAttendance();

  const [timeStr, setTimeStr] = useState<string>('');
  const [clockInModalOpen, setClockInModalOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      setTimeStr(new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800">Super Admin</span>;
      case 'HR_ADMIN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">HR Admin</span>;
      case 'MANAGER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">Manager</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Employee</span>;
    }
  };

  return (
    <header className="h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-40 transition-colors">
      
      {/* Left: Mobile menu toggle + Search + Shift Clock */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-56 md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search leaves, employees... (⌘K)"
            className="w-full pl-9 pr-12 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 transition"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </div>

        <div className="hidden 2xl:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300">
          <Clock className="w-3.5 h-3.5 text-indigo-500" />
          <span className="font-mono-num font-semibold text-slate-800 dark:text-slate-100">{timeStr}</span>
          <span className="border-l border-slate-300 dark:border-slate-600 pl-2 text-slate-400">Shift 09:00 AM - 06:00 PM</span>
        </div>
      </div>

      {/* Middle/Right: Persistent Prominent Header Punch Station */}
      <div className="flex items-center gap-2.5">
        
        {/* Persistent Punch Widget in Header — hidden only for Super Admin */}
        {!['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '') && (
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
            {punchState === 'NOT_CLOCKED_IN' ? (
              <button
                onClick={() => setClockInModalOpen(true)}
                disabled={punchLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm shadow-emerald-500/30 animate-pulse transition"
                title="Click to Clock In for Today"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Clock In</span>
              </button>
            ) : punchState === 'DONE' ? (
              <div className="px-3 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Shift Completed
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono-num font-bold text-slate-800 dark:text-slate-100">
                  <span className={`w-2 h-2 rounded-full ${punchState === 'WORKING' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span>{punchState === 'WORKING' ? formatTimer(workSeconds) : formatTimer(breakSeconds)}</span>
                </div>

                <button
                  onClick={toggleBreak}
                  disabled={punchLoading}
                  className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                    punchState === 'ON_BREAK'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                  title={punchState === 'ON_BREAK' ? 'Resume Work' : 'Take Break'}
                >
                  <Coffee className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={clockOut}
                  disabled={punchLoading}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm shadow-rose-500/20 transition"
                  title="Clock Out for the Day"
                >
                  <Square className="w-3 h-3 fill-white" />
                  <span className="hidden sm:inline">Clock Out</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition"
          title="Toggle Light/Dark Theme"
        >
          {theme === 'light' ? <Moon className="w-4 h-4 text-slate-600" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>

        {/* User Identity & Role Badge */}
        {user && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg">
            <img
              src={user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120'}
              alt=""
              className="w-6 h-6 rounded-full object-cover"
            />
            <div className="text-left">
              <strong className="block text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                {user.name}
              </strong>
              <span className="text-[10px] text-slate-400">
                {user.designation}
              </span>
            </div>
            {getRoleBadge(user.role)}
          </div>
        )}

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotifCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
          )}
        </button>

        {/* Sign Out Button */}
        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900/60 rounded-lg transition"
          title="Sign Out of Session"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Logout</span>
        </button>

      </div>

      <ClockInModal
        isOpen={clockInModalOpen}
        onClose={() => setClockInModalOpen(false)}
        userName={user?.name}
      />

    </header>
  );
};
