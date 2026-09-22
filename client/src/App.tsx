import React, { useState, useEffect } from 'react';
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
  const [activeTab, setActiveTab] = useState('overview');
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
  const urlParams = new URLSearchParams(window.location.search);
  const inviteToken = urlParams.get('token');

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
    setActiveTab(tab);
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
    return <ModernLoader fullScreen message="Loading Lexvera HRMS..." subMessage="Authenticating enterprise credentials & permissions" />;
  }

  // 2. If invite token in URL, show Set Password Activation view
  if (inviteToken) {
    return (
      <SetPasswordView
        token={inviteToken}
        onSuccess={() => {
          window.location.href = window.location.origin;
        }}
      />
    );
  }

  // 3. If no token, show Login View
  if (!token && !user) {
    return <LoginView onSuccess={() => setActiveTab('overview')} />;
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
        className={`flex-1 lg:ml-64 flex flex-col m-0 p-0 ${
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

        {/* Viewport Tabs: Full Screen Enterprise Layout */}
        <main
          className={`flex-1 flex flex-col w-full max-w-none ${
            activeTab === 'webmail'
              ? 'p-0 m-0 h-[calc(100vh-4rem)] overflow-hidden'
              : 'px-6 lg:px-8 py-6 pb-12 overflow-x-hidden'
          }`}
        >
          {activeTab === 'overview' && (
            <OverviewDashboard
              onNavigateToLeaves={() => handleTabChange('leaves')}
              onOpenApplyLeave={() => handleTabChange('leaves')}
              onOpenRegularize={() => handleTabChange('attendance')}
              onOpenCreateTask={() => handleTabChange('tasks')}
              onNavigateToWebmail={() => handleTabChange('webmail')}
              searchQuery={searchQuery}
            />
          )}
          {activeTab === 'webmail' && <WebmailView />}
          {activeTab === 'timesheets' && <TimesheetsView />}
          {activeTab === 'attendance' && <AttendanceView />}
          {activeTab === 'leaves' && <LeavesView />}
          {activeTab === 'payroll' && <PayrollView />}
          {activeTab === 'training' && <TrainingView />}
          {activeTab === 'directory' && <CompanyDirectoryView />}
          {activeTab === 'tasks' && (
            <TasksView
              onOpenCreateTask={() => setIsCreateTaskOpen(true)}
              searchQuery={searchQuery}
            />
          )}
          {activeTab === 'employees' && (
            (user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') ? (
              <EmployeeManagementView searchQuery={searchQuery} />
            ) : (
              <OverviewDashboard
                onNavigateToLeaves={() => handleTabChange('leaves')}
                onOpenApplyLeave={() => setIsApplyLeaveOpen(true)}
                onOpenRegularize={() => setIsRegularizeOpen(true)}
                onOpenCreateTask={() => setIsCreateTaskOpen(true)}
                searchQuery={searchQuery}
              />
            )
          )}
          {activeTab === 'team' && (
            (user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') ? (
              <TeamView />
            ) : (
              <OverviewDashboard
                onNavigateToLeaves={() => handleTabChange('leaves')}
                onOpenApplyLeave={() => setIsApplyLeaveOpen(true)}
                onOpenRegularize={() => setIsRegularizeOpen(true)}
                onOpenCreateTask={() => setIsCreateTaskOpen(true)}
                searchQuery={searchQuery}
              />
            )
          )}
          {activeTab === 'approvals' && (
            (user?.role === 'MANAGER' || user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') ? (
              <ManagerApprovalCenter />
            ) : (
              <OverviewDashboard searchQuery={searchQuery} />
            )
          )}
          {activeTab === 'lifecycle' && (
            (user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') ? (
              <LifecycleView />
            ) : (
              <OverviewDashboard searchQuery={searchQuery} />
            )
          )}
          {activeTab === 'recruitment' && (
            (user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') ? (
              <RecruitmentView />
            ) : (
              <OverviewDashboard searchQuery={searchQuery} />
            )
          )}
          {activeTab === 'broadcasts' && (
            <BroadcastsView onOpenCreateBroadcast={() => setIsCreateBroadcastOpen(true)} />
          )}
          {activeTab === 'reports' && (
            (user?.role === 'ADMIN' || user?.role === 'HR_ADMIN' || user?.role === 'MANAGER') ? (
              <ReportsView />
            ) : (
              <OverviewDashboard
                onNavigateToLeaves={() => handleTabChange('leaves')}
                onOpenApplyLeave={() => setIsApplyLeaveOpen(true)}
                onOpenRegularize={() => setIsRegularizeOpen(true)}
                onOpenCreateTask={() => setIsCreateTaskOpen(true)}
                searchQuery={searchQuery}
              />
            )
          )}
          {activeTab === 'timesheet-compliance' && (
            (user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') ? (
              <TimesheetMonitoringView />
            ) : (
              <OverviewDashboard searchQuery={searchQuery} />
            )
          )}
          {activeTab === 'policies' && (
            (user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') ? (
              <PolicyManagementView />
            ) : (
              <OverviewDashboard searchQuery={searchQuery} />
            )
          )}
          {activeTab === 'audit-logs' && (
            (user?.role === 'ADMIN' || user?.role === 'HR_ADMIN') ? (
              <AuditLogsView />
            ) : (
              <OverviewDashboard searchQuery={searchQuery} />
            )
          )}
          {activeTab === 'documents' && <DocumentsView />}
          {activeTab === 'assets' && <AssetsView />}
          {activeTab === 'profile' && <EmployeeProfileView />}
        </main>

      </div>

    </div>
  );
};
