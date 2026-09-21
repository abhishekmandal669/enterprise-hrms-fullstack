# Lexvera HRMS — Phase-Wise Roadmap & Task Register

> **Last Updated:** 2026-09-19  
> **Stack:** React + TypeScript (Vite) · Node.js + Express · Prisma · PostgreSQL · Socket.IO  
> **Status Key:** `[ ]` Pending · `[/]` In Progress · `[x]` Done

---

## PHASE 0 — Design & Architecture Corrections
> Fix documented gaps before new feature development begins.

### 0.0 — Attendance: Interactive Monthly Calendar & Day Detail Inspector [TOP PRIORITY]

- [x] **Interactive Monthly Attendance Calendar & Day Inspector**  
  Replace the static table view with a full monthly attendance calendar grid and deep day-level inspection drawer:  
  - **Monthly Calendar Grid:** Displays all days of the selected month with intuitive month/year navigation and a "Today" shortcut. times sare proerly calcute hone chaye make sure .
  - **Color-Coded Status Cells:**
    - `Present` (Emerald green) — displays logged hours (e.g. `8h 45m`)
    - `Late Arrival` (Warm amber) — displays late arrival time (e.g. `Late · 09:45 AM`)
    - `Half-Day` (Indigo/Blue) — displays logged half-day hours
    - `Absent` (Rose red) — highlights missing punch / unexcused absence
    - `Approved Leave` (Purple) — displays leave type (e.g. `Sick Leave`, `Casual Leave`)
    - `Holiday` (Cyan/Teal) — displays official holiday name
    - `Weekend` (Muted slate) — displays weekly off
  - **Day Detail Inspector (On Date Click):** Clicking any date opens an animated side drawer showing:
    - Exact **Clock-In** and **Clock-Out** timestamps (with IP / Office location)
    - **Total Net Work Duration** vs expected shift hours (with visual progress bar)
    - **Break Ledger Breakdown:** itemized list of breaks (Lunch, Tea) with start/end times and total duration
    - **Compliance & Work Mode:** Office / Remote / Hybrid tag and compliance badge
    - **One-Click Regularization Trigger:** pre-fills that specific date to raise a missing punch / late regularization request directly
  - **Monthly KPI Summary Strip:** At-a-glance monthly count of Present, Late, Half-Day, Absent, Leaves, total hours logged, and daily average.
  - **Backend Support:** Update `GET /attendance/my-timesheet` to accept `?month=X&year=Y`, include `breaks: true`, and aggregate holiday & leave records.  
  _Files:_ `client/src/views/AttendanceView.tsx`, `server/src/modules/attendance/attendanceController.ts`

- [x] **Timesheets Continuous Feed & Configurable Pagination (10, 25, 50, 100)**  
  Remove separate date-block grouping in favor of a clean, unified continuous timesheet table/list:  
  - **Flattened Unified Layout:** Display timesheet records in a streamlined list/table with clear Date columns/chips instead of heavy, nested date cards.  
  - **Configurable Pagination:** Add page size selector with options for `10`, `25`, `50`, and `100` entries per page.  
  - **Pagination Controls:** Show current page range (e.g. "Showing 1–25 of 142 entries"), Previous, Next, and numbered page jump buttons.  
  - **Precise Time Calculations:** Ensure 100% accurate time computations:  
    - Shift duration = `EndTime - StartTime` (with midnight-crossing support)  
    - Productive Core hours = `Shift Duration - Break Minutes`  
    - Validation preventing negative productive time (e.g. break exceeding shift)  
    - Consistent formatting across cards and tables (`X.X hrs` or `Xh Ym`).  
  - **Search & Filter Integrity:** Seamless search and filter by project, billable status, and date range across paginated views.  
  _Files:_ `client/src/views/TimesheetsView.tsx`, `server/src/modules/timesheets/timesheetController.ts`

### 0.1 — Role & Access Corrections

- [x] **HR Admin gets Clock-In access**  
  HR Admin staff are also employees. Remove the restriction that hides Clock-In for `HR_ADMIN`. Only `ADMIN` (Super Admin) should be exempt from attendance.  
  _Files:_ `Header.tsx`, `OverviewDashboard.tsx`, `AttendanceContext.tsx`

- [x] **Approval Center — HR Admin override**  
  If a reporting manager is on leave, leave requests must not get stuck. HR Admin should be able to approve/reject any employee's leave request as an override.  
  _Files:_ `leavesController.ts`, `ManagerApprovalCenter.tsx`

- [ ] **Approval Delegation (Act-as)**  
  Allow a manager to delegate approval authority to another user (e.g., "While I am on leave, X approves on my behalf") for a date range.  
  _New:_ `DelegationRequest` model in schema, delegation API, UI in Leave Management

- [x] **Clarify & Verify Timesheet Submission Flow**  
  Correct flow: **Every user (Employee + Manager) submits their own timesheet**. A Manager additionally reviews and approves their direct reports' submissions. HR Admin / Admin approves the Manager's own timesheet (or it auto-approves by policy). Verify the codebase and all documentation reflect this dual role of managers.  
  _Files:_ `TimesheetsView.tsx`, `timesheets` server module, `project_hierarchy.md` flow diagram

- [x] **Employee Read-Only Company Directory + Org Chart**  
  Employees should be able to see a read-only directory listing (name, designation, department, email, avatar) and a hierarchical org chart. No edit access.  
  _New:_ `/api/v1/employees/directory` endpoint (public read), `CompanyDirectoryView.tsx`

### 0.2 — Config-Driven RBAC (Dynamic Permissions)

- [/] **Replace hardcoded role checks with permission-based RBAC**  
  Define granular permissions (e.g., `leave.approve`, `report.view`, `employee.create`) and map them to roles in the database. This allows custom roles (e.g., "Team Lead", "Finance Analyst") without code changes.  
  _Affected:_ `roles` module, `AuthContext`, middleware `checkPermission`, all `can()` guards in UI  
  _Schema:_ `Permission`, `RolePermission` models  
  _Steps:_
  - [x] Design `permissions` table with all system capabilities
  - [x] Seed default role-permission mappings
  - [x] Implement `requirePermission` middleware and controller integration
  - [ ] Replace remaining hardcoded `user.role === 'ADMIN'` guards with `can('permission.name')` throughout UI
  - [ ] Admin UI panel to assign permissions to roles

---

## PHASE 1 — Priority 1: Core HR Gaps (Production-Critical)
> These are missing from any real-world HRMS. Must be built before go-live.

### 1.1 — Leave Accrual & Carry-Forward

- [x] **Monthly leave credit cron job**  
  Run a scheduled job (1st of every month) to credit `PL`, `CL`, `SL` balances per employee based on policy configuration.  
  _New:_ `node-cron` or `BullMQ` scheduler, `leaveAccrualJob.ts`

- [x] **Year-end reset & carry-forward**  
  On Jan 1 (configurable), carry forward unused `PL` up to the policy cap and reset `CL`, `SL` to zero.  
  _Schema:_ `LeaveBalance.carryForward` field, `LeaveCarryForwardLog` model

- [x] **Leave balance history log**  
  Employees and HR can view a ledger of credits, debits, and carry-forward transactions per leave type.

### 1.2 — Auto Attendance Marking

- [x] **Auto absent marking**  
  Scheduled job runs after shift end (e.g., 19:00). If no clock-in record found for the day and no approved leave exists, mark the employee `ABSENT`.  
  _New:_ `autoAbsentJob.ts`, `AttendanceStatus.ABSENT` enum value

- [x] **Auto half-day marking**  
  If an employee clocks in after the half-day threshold (configurable, e.g., 13:00) with no regularization, mark as `HALF_DAY`.

- [x] **Auto deduct half-day from leave balance on half-day attendance**

### 1.3 — Overtime & Compensatory Off

- [x] **Overtime detection**  
  If total work hours exceed standard shift hours (configurable), log overtime minutes automatically.  
  _Schema:_ `Attendance.overtimeMinutes`, `OvertimePolicy` model

- [x] **Compensatory Off accrual**  
  When an employee works on a declared holiday or weekend, credit a `COMP_OFF` leave day.  
  _Schema:_ `CompOffBalance`, `CompOffTransaction`

- [x] **Comp-off leave type in leave application flow**

### 1.4 — Attendance Security & Restrictions

- [x] **IP address restriction**  
  Admin configures allowed IP ranges for office clock-in. Server validates on clock-in request.  
  _Schema:_ `AttendancePolicy.allowedIpRanges`

- [x] **Geofence validation (server-side)**  
  Validate latitude/longitude against office coordinates and radius on clock-in. Currently client-side only — move validation to server.  
  _Schema:_ `AttendancePolicy.geoLatitude`, `geoLongitude`, `geoRadiusMeters`

- [ ] **Device binding (optional)**  
  Register a device fingerprint per employee. Reject clock-in from unregistered devices.

### 1.5 — Production-Grade Authentication

- [x] **Refresh token rotation**  
  Implement JWT refresh token with rotation and revocation. Store refresh tokens in DB with expiry.  
  _Schema:_ `RefreshToken` model  
  _Files:_ `authController.ts`, `AuthContext.tsx`

- [x] **Account lockout policy**  
  After N failed login attempts (configurable), lock the account for M minutes. Log attempt events.

- [ ] **Password policy enforcement**  
  Minimum length, complexity (uppercase, symbol), expiry (e.g., change every 90 days), no reuse of last N passwords.  
  _Schema:_ `PasswordHistory` model

- [ ] **Two-Factor Authentication (2FA)**  
  TOTP-based 2FA (Google Authenticator). Optional per user, enforceable by admin policy.  
  _New:_ `speakeasy` or `otplib` library, `MfaSecret` model, 2FA setup flow in Profile

### 1.6 — Document Management

- [ ] **File upload infrastructure**  
  Set up `multer` + local storage (or AWS S3 via `@aws-sdk/client-s3`) for secure file uploads.  
  _New:_ `uploadService.ts`, `Document` model

- [ ] **Employee document uploads**  
  Upload and store: ID proof, offer letter, NDA, experience certificates.  
  _UI:_ Document section in `EmployeeDetailDrawer` / `EmployeeProfileView`

- [ ] **Leave medical certificate**  
  Allow attaching a document (PDF/image) when applying for Sick Leave.  
  _Schema:_ `LeaveRequest.attachmentUrl`

- [ ] **Document access control**  
  Employees see only their own documents. HR Admin sees all. Manager sees their team's documents.

---

## PHASE 2 — Priority 2: Core HR Modules
> Full HRMS feature set. Required for HR team's day-to-day operations.

### 2.1 — Payroll & Payslips

- [x] **Salary structure definition**  
  Admin defines salary components: Basic, HRA, DA, Special Allowance, PF, ESI, TDS.  
  _Schema:_ `SalaryStructure` model, seed script, edit modal in `PayrollView.tsx`

- [x] **Monthly payroll run**  
  Calculate net pay per employee considering: salary structure, leaves taken (LOP), overtime, deductions.  
  _Engine:_ `payrollService.ts`, `PayrollRun`, `PayrollEntry` models

- [x] **PDF payslip generation**  
  Generate a professional corporate payslip per employee per month with native print/PDF styling.  
  _Component:_ `PayslipModal.tsx`, `PayrollView.tsx`

- [x] **Payslip download & in-app notification**  
  Employees can view/print their payslips via "My Payslips". System triggers in-app notification upon payroll finalization.

### 2.2 — Onboarding & Offboarding

- [x] **Onboarding checklist**  
  When a new employee is created, generate a checklist: IT setup, access credentials, device assignment, welcome email.  
  _Schema:_ `OnboardingTask`, `OnboardingChecklist` models

- [x] **Offboarding checklist**  
  When an employee is marked for exit: device return, access revocation, FnF settlement, exit interview scheduling.  
  _Schema:_ `OffboardingTask` model

- [x] **Exit management**  
  Capture last working date, reason for exit, relieving letter generation.

### 2.4 — Expense & Reimbursement

- [ ] **Expense claim submission**  
  Employee submits expense with: category, amount, date, receipt upload.  
  _Schema:_ `ExpenseClaim`, `ExpenseItem` models

- [ ] **Manager approval flow**  
  Manager approves/rejects claims. Finance team processes approved claims.

- [ ] **Expense reports**  
  Monthly expense summary per employee, department, category.

### 2.5 — Asset Management

- [ ] **Asset registry**  
  Admin registers company assets: laptops, phones, monitors, ID cards.  
  _Schema:_ `Asset`, `AssetAssignment` models

- [ ] **Assign / return assets**  
  Track which asset is assigned to which employee, from when, condition.

- [ ] **Asset report**  
  Assets by department, unassigned assets, assets due for return.

### 2.6 — Helpdesk / HR Tickets

- [ ] **Ticket submission**  
  Employees raise HR tickets: payslip discrepancy, leave issue, policy question, IT request.  
  _Schema:_ `HRTicket`, `TicketComment` models

- [ ] **Ticket assignment & resolution**  
  HR Admin assigns tickets to team members. Track status: Open → In Progress → Resolved.

- [ ] **SLA tracking**  
  Configure SLA per ticket category (e.g., payslip query resolved in 2 business days).

### 2.7 — Shift Roster / Scheduling

- [ ] **Shift roster creation**  
  Admin/Manager creates weekly/monthly shift roster per employee or team.  
  _Schema:_ `ShiftRoster`, `RosterEntry` models

- [ ] **Roster vs actual attendance comparison**  
  Compare scheduled shifts with actual punch data to identify deviations.

- [ ] **Shift swap requests**  
  Employees can request shift swaps with manager approval.

---

## PHASE 3 — Priority 3: Enhancement & Growth
> Long-term value additions. Build after Phase 2 is stable.

### 3.1 — Recruitment & ATS

- [x] **Job posting management**  
  Create internal/external job openings with requirements and deadline.  
  _Schema:_ `JobOpening`, `Candidate`, `Application` models

- [x] **Candidate pipeline**  
  Track candidates through: Applied → Screening → Interview → Offer → Joined/Rejected.

- [x] **Interview scheduling**  
  Schedule interviews, notify interviewers, collect feedback.

- [x] **Offer letter generation**  
  Auto-generate offer letter PDF with salary details on offer approval.

### 3.2 — Training & Certification Tracking

- [x] **Training programs**  
  HR creates training sessions (internal/external). Employees enroll.  
  _Schema:_ `TrainingProgram`, `TrainingEnrollment` models

- [x] **Certification records**  
  Employees upload certificates. System tracks expiry and notifies renewal.  
  _Schema:_ `Certification`, expiry alert cron

- [x] **Training completion reports**

### 3.3 — Custom Report Builder

- [x] **Drag-and-drop report builder**  
  Select fields, filters, group-by, sort order. Preview and export as CSV/PDF/Excel.

- [ ] **Scheduled report emails**  
  Admin schedules a report (e.g., monthly attendance summary) to be emailed automatically.  
  _New:_ `reportScheduler.ts`, cron + email service integration

### 3.4 — Biometric / Hardware Integration

- [ ] **Face recognition attendance (optional)**  
  Camera-based clock-in via face recognition service.

### 3.5 — Mobile App / PWA

- [ ] **Progressive Web App (PWA)**  
  Convert client to PWA: service worker, offline capability, home screen install.  
  _Priority use case:_ Mobile clock-in with geolocation for field employees.

- [ ] **Push notifications**  
  Web push notifications for leave approvals, payslip generation, announcements.

- [ ] **Native mobile app (React Native)**  
  Long-term: iOS + Android app with biometric authentication.

### 3.6 — Internationalisation (i18n)

- [x] **i18n framework setup**  
  Integrate language context with bilingual locale dictionaries.

- [x] **English (default) + Hindi language support**  
  Translate navigation labels, common actions, and statuses with dynamic switcher in topbar.

- [ ] **Locale-aware date/number/currency formatting**

---

## Open Architecture Decisions

| # | Decision | Options | Status |
|---|---|---|---|
| 1 | File storage backend | Local filesystem vs AWS S3 vs Cloudflare R2 | Pending |
| 2 | Payroll calculation engine | Custom vs integration (Razorpay Payroll / Zoho) | Pending |
| 3 | 2FA delivery method | TOTP app vs SMS OTP vs Email OTP | Pending |
| 4 | Biometric sync method | API pull vs device SDK vs manual CSV import | Pending |
| 5 | Mobile strategy | PWA first vs React Native | Pending |
| 6 | Report export format | CSV + PDF (Phase 2) vs full Excel builder (Phase 3) | Pending |

---

## Immediate Next Tasks (Sprint 1)

- [x] **[TOP PRIORITY]** Interactive Monthly Attendance Calendar & Day Detail Inspector (`AttendanceView.tsx`, `attendanceController.ts`)
- [x] **[TOP PRIORITY]** Timesheets View: Remove date-block grouping, add pagination (10/25/50/100) & verified time calculation (`TimesheetsView.tsx`)
- [x] Restore Clock-In for HR Admin role
- [x] HR Admin leave approval override
- [x] Fix timesheet flow documentation (employee submits, manager approves)
- [x] Employee read-only company directory endpoint + view
- [x] Design `Permission` + `RolePermission` schema for config-driven RBAC
- [x] Seed initial permission set and migrate role guards



**Testing perspective (QA ke liye important)**

- Kyunki is project me business rules bahut hain, in areas pe zyada focus karo:

- Leave balance calculation (half-day, weekends/holidays overlap, negative balance, cancel after approval)
- Attendance edge cases: double punch, midnight shift, timezone, regularization approve hone ke baad hours recalculation
- RBAC testing: har role ke liye har API pe negative tests (Employee kisi aur ka data na dekh paye, direct API call se bhi)
- Concurrency: do managers ek hi request approve karein, ya user do tabs me clock-in kare
- WebSocket: disconnect/reconnect ke baad state sync
- Invite link: expiry, reuse, tampering