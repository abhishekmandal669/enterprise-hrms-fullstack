# Lexvera HRMS — Project Hierarchy & Flow

## Tech Stack Overview

```
Lexvera HRMS
├── client/          → React + TypeScript + Vite (Frontend)
└── server/          → Node.js + Express + Prisma (Backend)
```

---

## Project Directory Structure

```
Lexvera/
├── client/
│   └── src/
│       ├── App.tsx              # Root router & auth guard
│       ├── main.tsx             # Entry point
│       ├── context/             # Global state providers
│       │   ├── AuthContext      # User session & permissions
│       │   ├── AttendanceContext # Live punch state
│       │   ├── SocketContext    # WebSocket + toast system
│       │   └── ThemeContext     # Light / Dark mode
│       ├── components/          # Reusable UI components
│       │   ├── Sidebar
│       │   ├── Header
│       │   ├── ClockInModal
│       │   ├── ApplyLeaveModal
│       │   ├── RegularizationModal
│       │   ├── CreateTaskModal
│       │   ├── SubmitTimesheetModal
│       │   ├── EmployeeDetailDrawer
│       │   ├── NotificationDrawer
│       │   └── AddEmployeeModal
│       ├── views/               # Page-level views
│       │   ├── LoginView
│       │   ├── OverviewDashboard
│       │   ├── AttendanceView
│       │   ├── LeavesView
│       │   ├── TimesheetsView
│       │   ├── TasksView
│       │   ├── WebmailView
│       │   ├── BroadcastsView
│       │   ├── TeamView
│       │   ├── EmployeeManagementView
│       │   ├── EmployeeProfileView
│       │   ├── ReportsView
│       │   ├── PolicyManagementView
│       │   └── AuditLogsView
│       ├── pages/               # Role-specific pages
│       │   └── manager/
│       │       └── ManagerApprovalCenter
│       └── services/
│           └── api.ts           # Axios HTTP client
│
└── server/
    └── src/
        ├── server.ts            # Express app entry
        ├── config/              # DB, env config
        ├── middleware/          # Auth guard, RBAC
        ├── modules/             # Feature API handlers
        │   ├── auth             # Login / token / invite
        │   ├── employees        # CRUD, directory
        │   ├── attendance       # Clock-in/out, regularize
        │   ├── leaves           # Apply, approve, balance
        │   ├── timesheets       # Weekly logs, compliance
        │   ├── tasks            # Kanban tasks & projects
        │   ├── mail             # Internal webmail
        │   ├── broadcasts       # Company announcements
        │   ├── notifications    # Real-time alerts
        │   ├── reports          # Analytics exports
        │   ├── policies         # Shifts, leave rules
        │   ├── dashboard        # Aggregated stats
        │   ├── audit-logs       # Activity trail
        │   ├── roles            # RBAC management
        │   └── holidays         # Holiday calendar
        ├── websocket/           # Socket.IO real-time events
        ├── services/            # Email, notification service
        └── utils/               # Helpers & formatters
```

---

## Request Flow Diagram

```mermaid
flowchart TD
    A([User Browser]) --> B[React App\nVite + TypeScript]
    B --> C{Authenticated?}
    C -- No --> D[LoginView]
    D -- POST /api/v1/auth/login --> E
    C -- Yes --> F[App Layout\nSidebar + Header]

    F --> G{User Role}
    G --> H[ADMIN / HR_ADMIN]
    G --> I[MANAGER]
    G --> J[EMPLOYEE]

    H --> K[All Views + Policy\nAudit Logs + Reports]
    I --> L[Team + Approvals\nTimesheets + Tasks]
    J --> M[Dashboard + Leaves\nAttendance + Webmail]

    B -- HTTP REST --> E[Express Server\nNode.js]
    B -- Socket.IO --> N[WebSocket Server]
    N -- Live Events --> B

    E --> O[Auth Middleware\nJWT + RBAC]
    O --> P{Route Module}

    P --> Q[attendance]
    P --> R[leaves]
    P --> S[timesheets]
    P --> T[tasks]
    P --> U[employees]
    P --> V[mail / broadcasts]
    P --> W[reports / audit]

    Q & R & S & T & U & V & W --> X[(PostgreSQL\nvia Prisma ORM)]
```

---

## Role → Feature Access Map

| Feature | Admin | HR Admin | Manager | Employee |
|---|:---:|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Attendance / Clock-In | — | — | ✓ | ✓ |
| Leave Management | ✓ | ✓ | ✓ | ✓ |
| Timesheets | ✓ | ✓ | ✓ | ✓ |
| Tasks & Projects | ✓ | ✓ | ✓ | ✓ |
| Webmail | ✓ | ✓ | ✓ | ✓ |
| Announcements | ✓ | ✓ | ✓ | ✓ |
| Approval Center | — | — | ✓ | — |
| Team Roster | ✓ | ✓ | ✓ | — |
| Employee Directory | ✓ | ✓ | — | — |
| Timesheet Compliance | ✓ | ✓ | — | — |
| Reports & Analytics | ✓ | ✓ | ✓ | — |
| Policies & Shifts | ✓ | ✓ | — | — |
| Audit Logs | ✓ | ✓ | — | — |

---

## Data Flow — Key Modules

```mermaid
flowchart LR
    EMP([Employee]) -- Clock In --> ATT[Attendance Module]
    ATT -- stores punch --> DB[(PostgreSQL)]
    ATT -- emits live event --> WS[WebSocket]
    WS -- dashboard update --> DASH[Dashboard]

    EMP -- Apply Leave --> LEV[Leaves Module]
    LEV -- notify manager --> NOTIF[Notifications]
    MGR([Manager]) -- Approve/Reject --> LEV
    LEV -- update balance --> DB

    MGR -- Submit Timesheet --> TS[Timesheets Module]
    TS -- compliance check --> DB

    ADMIN([Admin]) -- Create Employee --> EMP_MOD[Employees Module]
    EMP_MOD -- send invite email --> MAIL[Mail Service]
    MAIL -- set-password link --> EMP
```
