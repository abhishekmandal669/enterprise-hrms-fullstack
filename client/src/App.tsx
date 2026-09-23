import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { UrgentModal } from './components/UrgentModal';
import { ApplyLeaveModal } from './components/ApplyLeaveModal';
import { CreateBroadcastModal } from './components/CreateBroadcastModal';
import { CreateTaskModal } from './components/CreateTaskModal';
import { RegularizationModal } from './components/RegularizationModal';
import { NotificationDrawer } from './components/NotificationDrawer';
import { SubmitTimesheetModal } from './components/SubmitTimesheetModal';

// Views
import { OverviewDashboard } from './views/OverviewDashboard';
import { AttendanceView } from './views/AttendanceView';
import { LeavesView } from './views/LeavesView';
import { TasksView } from './views/TasksView';
import { TimesheetsView } from './views/TimesheetsView';
import { CompanyDirectoryView } from './views/CompanyDirectoryView';
import { EmployeeManagementView } from './views/EmployeeManagementView';
import { EditEmployeeView } from './views/EditEmployeeView';
import { TeamView } from './views/TeamView';
import { BroadcastsView } from './views/BroadcastsView';
import { ReportsView } from './views/ReportsView';
import { PolicyManagementView } from './views/PolicyManagementView';
import { AuditLogsView } from './views/AuditLogsView';
import { EmployeeProfileView } from './views/EmployeeProfileView';
import { ManagerApprovalCenter } from './pages/manager/ManagerApprovalCenter';
import { TimesheetMonitoringView } from './pages/admin/TimesheetMonitoringView';
import { SetPasswordView } from './views/SetPasswordView';
import { LoginView } from './views/LoginView';
import { WebmailView } from './views/WebmailView';
import { PayrollView } from './views/PayrollView';
import { LifecycleView } from './views/LifecycleView';
import { RecruitmentView } from './views/RecruitmentView';
import { TrainingView } from './views/TrainingView';
import { AssetsView } from './views/AssetsView';
import { DocumentsView } from './views/DocumentsView';
import { ModernLoader } from './components/ModernLoader';

import api from './services/api';
import { mailApi } from './services/mailApi';

export const App: React.FC = () => {
  const { user, token, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Extract route path without leading slash
  const currentPath = location.pathname.replace(/^\//, '');
  const primarySection = currentPath.split('/')[0];
  const activeTab = primarySection === 'dashboard' || primarySection === '' ? 'overview' : primarySection;

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isApplyLeaveOpen, setIsApplyLeaveOpen] = useState(false);
  const [isCreateBroadcastOpen, setIsCreateBroadcastOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isRegularizeOpen, setIsRegularizeOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isLogWorkOpen, setIsLogWorkOpen] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);
  const [unreadMailCount, setUnreadMailCount] = useState(0);

  // Check for invite activation URL ?token=...
  const inviteToken = searchParams.get('token');

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUnreadMail = async () => {
    try {
      const count = await mailApi.getUnreadCount();
      setUnreadMailCount(count);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingCount = async () => {
    try {
      const res = await api.get('/leaves/requests');
      if (res.data.success) {
        const count = res.data.data.filter((l: any) => l.status === 'PENDING').length;
        setPendingLeavesCount(count);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchPendingCount();
      fetchUnreadMail();
    }
    // Auto-dismiss all open modals & drawers on page/tab navigation
    setIsApplyLeaveOpen(false);
    setIsCreateBroadcastOpen(false);
    setIsCreateTaskOpen(false);
    setIsRegularizeOpen(false);
    setIsNotificationsOpen(false);
    setIsLogWorkOpen(false);
  }, [user?.role, activeTab]);

  const handleTabChange = (tab: string) => {
    setIsApplyLeaveOpen(false);
    setIsCreateBroadcastOpen(false);
    setIsCreateTaskOpen(false);
    setIsRegularizeOpen(false);
    setIsNotificationsOpen(false);
    setIsLogWorkOpen(false);
    const target = tab === 'overview' ? '/dashboard' : `/${tab}`;
    navigate(target);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/mark-all-read');
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  // 1. If auth session is initializing, show high-end branded modern loader
  if (isLoading) {
    return <ModernLoader fullScreen message="Loading Nexus HRMS..." subMessage="Authenticating enterprise credentials & permissions" />;
  }

  // 2. If invite token in URL, show Set Password Activation view
  if (inviteToken) {
    return (
      <>
        <ToastContainer />
        <SetPasswordView
          token={inviteToken}
          onSuccess={() => {
            navigate('/login', { replace: true });
          }}
        />
      </>
    );
  }

  // 3. If unauthenticated, route all traffic through /login
  if (!token && !user) {
    return (
      <>
        <ToastContainer />
        <Routes>
          <Route
            path="/login"
            element={<LoginView onSuccess={() => navigate('/dashboard', { replace: true })} />}
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </>
    );
  }

  return (
    <div className="min-h-screen m-0 p-0 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors">
      
      {/* Toast Engine */}
      <ToastContainer />

      {/* Urgent Screen Freeze Modal */}
      <UrgentModal />

      {/* Modals & Drawers */}
      <SubmitTimesheetModal
        isOpen={isLogWorkOpen}
        onClose={() => setIsLogWorkOpen(false)}
        onSuccess={() => {
          fetchNotifications();
        }}
      />

      <ApplyLeaveModal
        isOpen={isApplyLeaveOpen}
        onClose={() => setIsApplyLeaveOpen(false)}
        onSuccess={() => {
          fetchPendingCount();
          fetchNotifications();
        }}
      />

      <CreateBroadcastModal
        isOpen={isCreateBroadcastOpen}
        onClose={() => setIsCreateBroadcastOpen(false)}
        onSuccess={() => {
          fetchNotifications();
        }}
      />

      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSuccess={() => {
          fetchNotifications();
        }}
      />

      <RegularizationModal
        isOpen={isRegularizeOpen}
        onClose={() => setIsRegularizeOpen(false)}
        onSuccess={() => {
          fetchNotifications();
        }}
      />

      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAllRead={handleMarkAllRead}
      />

      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        pendingLeavesCount={pendingLeavesCount}
        unreadMailCount={unreadMailCount}
        mobileOpen={mobileSidebarOpen}
        setMobileOpen={setMobileSidebarOpen}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 lg:ml-64 flex flex-col m-0 p-0 min-w-0 max-w-full overflow-x-hidden ${
          activeTab === 'webmail' ? 'h-screen max-h-screen overflow-hidden' : 'min-h-screen'
        }`}
      >
        
        {/* Topbar */}
        <Header
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          unreadNotifCount={notifications.filter(n => !n.isRead).length}
          onToggleMobileSidebar={() => setMobileSidebarOpen(prev => !prev)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Viewport Tabs: Full Screen Enterprise Layout with URL Routing */}
        <main
          className={`flex-1 flex flex-col w-full max-w-full min-w-0 ${
            activeTab === 'webmail'
              ? 'p-0 m-0 h-[calc(100vh-4rem)] overflow-hidden'
              : 'px-3 sm:px-6 lg:px-8 py-4 sm:py-6 pb-20 sm:pb-12 overflow-x-hidden'
          }`}
        >
          <Routes>
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/overview" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={
                <OverviewDashboard
                  onNavigateToLeaves={() => navigate('/leaves')}
                  onOpenApplyLeave={() => navigate('/leaves')}
                  onOpenRegularize={() => navigate('/attendance')}
                  onOpenCreateTask={() => navigate('/tasks')}
                  onNavigateToWebmail={() => navigate('/webmail')}
                  searchQuery={searchQuery}
                />
              }
            />
            <Route path="/webmail" element={<WebmailView />} />
            <Route path="/timesheets" element={<TimesheetsView />} />
            <Route path="/attendance" element={<AttendanceView />} />
            <Route path="/leaves" element={<LeavesView />} />
            <Route path="/payroll" element={<PayrollView />} />
            <Route path="/training" element={<TrainingView />} />
            <Route path="/directory" element={<CompanyDirectoryView />} />
            <Route
              path="/tasks"
              element={
                <TasksView
                  onOpenCreateTask={() => setIsCreateTaskOpen(true)}
                  searchQuery={searchQuery}
                />
              }
            />
            <Route
              path="/employees/:id/edit"
              element={
                (user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') ? (
                  <EditEmployeeView />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="/employees/:id"
              element={
                (user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') ? (
                  <EmployeeManagementView searchQuery={searchQuery} />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="/employees"
              element={
                (user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') ? (
                  <EmployeeManagementView searchQuery={searchQuery} />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="/team"
              element={
                (user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') ? (
                  <TeamView />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="/approvals"
              element={
                (user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') ? (
                  <ManagerApprovalCenter />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="/lifecycle"
              element={
                (user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') ? (
                  <LifecycleView />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="/recruitment"
              element={
                (user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') ? (
                  <RecruitmentView />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="/broadcasts"
              element={
                <BroadcastsView onOpenCreateBroadcast={() => setIsCreateBroadcastOpen(true)} />
              }
            />
            <Route path="/announcements" element={<Navigate to="/broadcasts" replace />} />
            <Route
              path="/reports"
              element={
                (user?.role === 'ADMIN' || user?.role === 'HR_ADMIN' || user?.role === 'MANAGER') ? (
                  <ReportsView />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="/timesheet-compliance"
              element={
                (user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') ? (
                  <TimesheetMonitoringView />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="/policies"
              element={
                (user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') ? (
                  <PolicyManagementView />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="/audit-logs"
              element={
                (user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') ? (
                  <AuditLogsView />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route path="/documents" element={<DocumentsView />} />
            <Route path="/assets" element={<AssetsView />} />
            <Route path="/profile" element={<EmployeeProfileView />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>

      </div>

    </div>
  );
};
