# Lexvera Enterprise HRMS & Workforce ERP (`enterprise-hrms-fullstack`)

> Modern, full-stack Enterprise Human Resource Management System (HRMS) & Workforce Suite built with React 18, TypeScript, TailwindCSS, Node.js, Express, Prisma ORM, and WebSocket real-time engine.

---

## Key Features

-  **Attendance & Shift Monitor**: Real-time live check-ins, monthly attendance grid, automated punch regularizations, and IP/geofencing policies.
- ⏱️ **Timesheets & Daily Work Operations**: Time-based logging with monthly calendar matrix, weekly/daily efficiency tracking, and one-click quick logging.
- 🌴 **Leave Management & Quota Vault**: Dynamic leave balance ledgers (PL, CL, SL, Maternity), half-day slot support, medical certificate uploads, and delegation approval workflows.
-  **Payroll & Payslip Generator**: Automated monthly salary processing, configurable tax slabs, deductions, allowances, and downloadable employee payslips.
-  **Company Asset Tracking**: Hardware inventory lifecycle tracking (Laptops, Monitors, Phones), asset assignment, return handovers, and condition status.
-  **Encrypted Document Vault**: Employee identity proofs, offer letters, NDAs, and certificate management with secure storage and access controls.
-  **Employee Lifecycle**: Automated onboarding checklists, probation tracking, exit interviews, and full & final (F&F) settlements.
- 👥 **Dynamic RBAC & Act-As Delegation**: Fine-grained permissions (Super Admin, HR Admin, Manager, Employee) with temporary approval handover delegation.
- ✉️ **Real-Time Webmail & Broadcasts**: Internal team communication, urgent broadcast announcements, and WebSocket notification channels.

---

##  Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Socket.IO Client
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, JWT, Bcrypt, Socket.IO
- **Database**: SQLite (Development) / PostgreSQL-ready (Production)

---

## ⚡ Quick Start

### 1. Backend Setup
```bash
cd server
npm install
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```

### 2. Client Setup
```bash
cd client
npm install
npm run dev
```

The application will be running at `http://localhost:5173`.
Default API server is at `http://localhost:5000/api/v1`.
