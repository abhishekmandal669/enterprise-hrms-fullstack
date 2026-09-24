# Nexus Enterprise HRMS — Comprehensive SQL Queries & Database Guide

> **Database File Location**: `server/prisma/dev.db` (SQLite Database)  
> **Database GUI Viewer**: **DB Browser for SQLite**, **DBeaver**, **VS Code SQLite Viewer Extension**, ya terminal me run karein `npx prisma studio`.

Ye document **Nexus Enterprise HRMS** ke sabhi modules ke **practical SQL queries** provide karta hai. Har query ke sath bataya gaya hai ki:
- **Kyu use hoti hai (Purpose)**
- **Kab use karein (Trigger Scenario / When to use)**
- **Output me kya milega (Expected Result)**

---

## 📌 Index / Table of Contents
1. [Database Connect & View Kaise Karein?](#1-database-connect--view-kaise-karein)
2. [Module 1: Employees, Roles & Department Hierarchy](#module-1-employees-roles--department-hierarchy)
3. [Module 2: Biometric Attendance, Punch Logs & Regularization](#module-2-biometric-attendance-punch-logs--regularization)
4. [Module 3: Leave Management & Balance Tracking](#module-3-leave-management--balance-tracking)
5. [Module 4: Daily Timesheets & Work Logs](#module-4-daily-timesheets--work-logs)
6. [Module 5: Salary Structure, Payroll Runs & Payslips](#module-5-salary-structure-payroll-runs--payslips)
7. [Module 6: Internal Webmail System (Inbox, Sent & Unread)](#module-6-internal-webmail-system-inbox-sent--unread)
8. [Module 7: Task Management & Assignments](#module-7-task-management--assignments)
9. [Module 8: Employee Lifecycle (Onboarding & Exit Offboarding)](#module-8-employee-lifecycle-onboarding--exit-offboarding)
10. [Module 9: Recruitment / ATS (Jobs, Candidates & Interviews)](#module-9-recruitment--ats-jobs-candidates--interviews)
11. [Module 10: Asset Allocation & Document Management](#module-10-asset-allocation--document-management)
12. [Module 11: Security, Audit Trail & System Activity](#module-11-security-audit-trail--system-activity)
13. [Module 12: Executive Analytics & MIS Reports (Aggregations)](#module-12-executive-analytics--mis-reports-aggregations)
14. [Module 13: Quick Troubleshooting & Emergency DB Fixes](#module-13-quick-troubleshooting--emergency-db-fixes)

---

## 1. Database Connect & View Kaise Karein?

Aap database ko 3 aasan tareeko se dekh sakte hain:

### Tareeka A: Visual Web Studio (Recommended - Zero Installation)
Server directory me command run karein:
```bash
cd server
npx prisma studio
```
Browser me `http://localhost:5555` open hoga jisme aap real-time me sabhi tables ka data browse, edit aur filter kar sakte hain.

### Tareeka B: DB Browser for SQLite / DBeaver (Desktop GUI)
1. **DB Browser for SQLite** open karein.
2. `Open Database` click karke select karein: `c:\Users\Abhishek Kr Mandal\Desktop\enterprise-hrms\server\prisma\dev.db`
3. `Execute SQL` tab me jakar niche diye gaye koi bhi query paste karke **F5** ya **Play** button dabayein.

---

## Module 1: Employees, Roles & Department Hierarchy

### 1.1 Sabhi Active Employees ki List unke Department aur Reporting Manager ke sath
* **Kyu aur Kab use karein?** Jab aapko dekhna ho ki company me kitne employees active hain, wo kis department me hain, unka designation kya hai aur unka reporting manager kaun hai.
```sql
SELECT 
    u.employeeCode AS "Emp Code",
    u.firstName || ' ' || u.lastName AS "Employee Name",
    u.email AS "Official Email",
    u.role AS "System Role",
    u.designation AS "Designation",
    COALESCE(d.name, 'Unassigned') AS "Department",
    COALESCE(m.firstName || ' ' || m.lastName, 'No Manager (Top Level)') AS "Reporting Manager",
    u.joiningDate AS "Joining Date",
    u.status AS "Account Status"
FROM "User" u
LEFT JOIN "Department" d ON u.departmentId = d.id
LEFT JOIN "User" m ON u.reportingManagerId = m.id
WHERE u.status = 'ACTIVE'
ORDER BY d.name ASC, u.firstName ASC;
```

### 1.2 Ek Particular Manager ke under kitne log report karte hain (Team Hierarchy)
* **Kyu aur Kab use karein?** Team lead ya manager approval center me jab dekhna ho ki Priya Narayanan ya kisi specific manager ki team me kaun-kaun hai.
```sql
SELECT 
    m.firstName || ' ' || m.lastName AS "Manager Name",
    u.employeeCode AS "Reportee Code",
    u.firstName || ' ' || u.lastName AS "Reportee Name",
    u.designation AS "Designation",
    u.email AS "Reportee Email"
FROM "User" u
JOIN "User" m ON u.reportingManagerId = m.id
WHERE m.email = 'manager@nexus.com' -- Yaha manager ka email dalein
ORDER BY u.firstName ASC;
```

### 1.3 Department-wise Employee Headcount aur Active Stats
* **Kyu aur Kab use karein?** HR aur Executive dashboard par department analytics check karne ke liye.
```sql
SELECT 
    d.name AS "Department Name",
    d.code AS "Dept Code",
    COUNT(u.id) AS "Total Employees",
    SUM(CASE WHEN u.status = 'ACTIVE' THEN 1 ELSE 0 END) AS "Active Staff",
    SUM(CASE WHEN u.status = 'PROBATION' THEN 1 ELSE 0 END) AS "On Probation"
FROM "Department" d
LEFT JOIN "User" u ON d.id = u.departmentId
GROUP BY d.id, d.name, d.code
ORDER BY "Total Employees" DESC;
```

---

## Module 2: Biometric Attendance, Punch Logs & Regularization

### 2.1 Aaj ki Live Attendance (Clock-In, Clock-Out, Total Hours aur Late Marks)
* **Kyu aur Kab use karein?** Daily operations me dekhna ho ki aaj kisne kab punch kiya, kaun present hai aur kaun late aaya.
```sql
SELECT 
    u.employeeCode AS "Emp Code",
    u.firstName || ' ' || u.lastName AS "Name",
    a.date AS "Date",
    a.clockIn AS "Clock In Time",
    COALESCE(a.clockOut, 'Still Working') AS "Clock Out Time",
    ROUND(a.totalHours, 2) AS "Total Hours",
    a.status AS "Status",
    CASE WHEN a.isLate = 1 THEN 'YES (Late)' ELSE 'On Time' END AS "Late Flag",
    a.workType AS "Mode (OFFICE/REMOTE)",
    a.lateReason AS "Late Reason"
FROM "Attendance" a
JOIN "User" u ON a.userId = u.id
ORDER BY a.date DESC, a.clockIn DESC
LIMIT 50;
```

### 2.2 Kis Employee ne kitna Break liya (Coffee, Lunch, Short Break)
* **Kyu aur Kab use karein?** Productivity monitoring aur break durations audit karne ke liye.
```sql
SELECT 
    u.employeeCode AS "Emp Code",
    u.firstName || ' ' || u.lastName AS "Name",
    a.date AS "Attendance Date",
    ab.type AS "Break Type",
    ab.startTime AS "Break Start",
    COALESCE(ab.endTime, 'Ongoing') AS "Break End",
    COALESCE(ab.durationMinutes, 0) AS "Duration (Mins)"
FROM "AttendanceBreak" ab
JOIN "Attendance" a ON ab.attendanceId = a.id
JOIN "User" u ON a.userId = u.id
ORDER BY ab.startTime DESC
LIMIT 50;
```

### 2.3 Pending Regularization Requests (Missed Punch Requests)
* **Kyu aur Kab use karein?** Jab kisi employee ka biometric punch miss ho gaya ho aur usne correction request raise ki ho jo Manager ke paas approval ke liye pending hai.
```sql
SELECT 
    r.id AS "Request ID",
    u.employeeCode AS "Emp Code",
    u.firstName || ' ' || u.lastName AS "Employee Name",
    r.date AS "Target Date",
    r.requestedClockIn AS "Requested In",
    r.requestedClockOut AS "Requested Out",
    r.reason AS "Reason Given",
    r.status AS "Approval Status",
    COALESCE(appr.firstName || ' ' || appr.lastName, 'Pending Assignment') AS "Approver Name"
FROM "RegularizationRequest" r
JOIN "User" u ON r.userId = u.id
LEFT JOIN "User" appr ON r.approverId = appr.id
WHERE r.status = 'PENDING'
ORDER BY r.createdAt DESC;
```

---

## Module 3: Leave Management & Balance Tracking

### 3.1 Har Employee ka Current Leave Balance (Casual, Sick, Earned Leave)
* **Kyu aur Kab use karein?** HR ya employee profile view me dekhne ke liye ki employee ke paas kitni leaves bachi hain.
```sql
SELECT 
    u.employeeCode AS "Emp Code",
    u.firstName || ' ' || u.lastName AS "Employee Name",
    lt.name AS "Leave Type",
    lb.allocated AS "Total Quota",
    lb.used AS "Leaves Taken",
    lb.pending AS "In Approval",
    (lb.allocated - lb.used) AS "Remaining Balance"
FROM "LeaveBalance" lb
JOIN "User" u ON lb.userId = u.id
JOIN "LeaveType" lt ON lb.leaveTypeId = lt.id
ORDER BY u.employeeCode ASC, lt.name ASC;
```

### 3.2 Pending Leave Applications (Approvals Inbox)
* **Kyu aur Kab use karein?** Manager Approval Center me dekhne ke liye ki kin-kin employees ne chhutti apply ki hai aur kiski leave approve karni hai.
```sql
SELECT 
    lr.id AS "Leave ID",
    u.employeeCode AS "Emp Code",
    u.firstName || ' ' || u.lastName AS "Applicant",
    lt.name AS "Type",
    lr.startDate AS "From Date",
    lr.endDate AS "To Date",
    lr.totalDays AS "Total Days",
    lr.reason AS "Reason",
    lr.status AS "Status",
    lr.createdAt AS "Applied At"
FROM "LeaveRequest" lr
JOIN "User" u ON lr.userId = u.id
JOIN "LeaveType" lt ON lr.leaveTypeId = lt.id
WHERE lr.status = 'PENDING'
ORDER BY lr.createdAt ASC;
```

### 3.3 Approved vs Rejected Leaves Summary
* **Kyu aur Kab use karein?** Monthly HR audits me dekhne ke liye ki kitni chhuttiyan approve ya reject hui hain aur kin managers ne approve kiya.
```sql
SELECT 
    u.firstName || ' ' || u.lastName AS "Employee",
    lt.name AS "Leave Type",
    lr.startDate || ' to ' || lr.endDate AS "Duration",
    lr.totalDays AS "Days",
    lr.status AS "Decision",
    COALESCE(m.firstName || ' ' || m.lastName, 'System/Admin') AS "Decided By",
    COALESCE(lr.rejectionReason, 'N/A') AS "Rejection Remarks"
FROM "LeaveRequest" lr
JOIN "User" u ON lr.userId = u.id
JOIN "LeaveType" lt ON lr.leaveTypeId = lt.id
LEFT JOIN "User" m ON lr.approverId = m.id
WHERE lr.status IN ('APPROVED', 'REJECTED')
ORDER BY lr.updatedAt DESC
LIMIT 50;
```

---

## Module 4: Daily Timesheets & Work Logs

### 4.1 Daily Timesheet Submissions (Billable vs Non-Billable Hours)
* **Kyu aur Kab use karein?** Engineering aur project management me dekhna ki developers ne kitne ghante kaam log kiya hai.
```sql
SELECT 
    ts.id AS "Timesheet ID",
    u.employeeCode AS "Emp Code",
    u.firstName || ' ' || u.lastName AS "Employee",
    ts.date AS "Work Date",
    ts.totalHours AS "Total Hours",
    ts.billableHours AS "Billable Hours",
    ts.tasksDescription AS "Work Description",
    ts.status AS "Approval Status"
FROM "DailyTimesheet" ts
JOIN "User" u ON ts.userId = u.id
ORDER BY ts.date DESC
LIMIT 50;
```

### 4.2 Projects aur unke Total Logged Hours
* **Kyu aur Kab use karein?** Project cost tracking aur client billing analysis ke liye.
```sql
SELECT 
    p.code AS "Project Code",
    p.name AS "Project Title",
    p.status AS "Project Status",
    COALESCE(p.budget, 0) AS "Budget ($)",
    COALESCE(p.clientName, 'Internal') AS "Client"
FROM "Project" p
ORDER BY p.name ASC;
```

---

## Module 5: Salary Structure, Payroll Runs & Payslips

### 5.1 Employee Salary Breakdown (CTC, Basic, Allowances & Deductions)
* **Kyu aur Kab use karein?** Payroll processing se pehle verify karna ki kis employee ka kitna base pay, HRA, PF aur Net monthly take-home salary set hai.
```sql
SELECT 
    u.employeeCode AS "Emp Code",
    u.firstName || ' ' || u.lastName AS "Employee Name",
    s.baseSalary AS "Basic Salary",
    s.hra AS "HRA",
    s.conveyance AS "Conveyance",
    s.specialAllowance AS "Special Allowance",
    s.pfDeduction AS "PF Deduction",
    s.professionalTax AS "Prof. Tax",
    s.tdsDeduction AS "TDS",
    s.netSalary AS "Calculated Net Pay"
FROM "SalaryStructure" s
JOIN "User" u ON s.userId = u.id
ORDER BY s.netSalary DESC;
```

### 5.2 Monthly Processed Payroll Runs (Batch Audit)
* **Kyu aur Kab use karein?** Monthly payroll batch status dekhne ke liye (Draft, Approved, Dispatched).
```sql
SELECT 
    pr.id AS "Run ID",
    pr.month || '/' || pr.year AS "Payroll Cycle",
    pr.status AS "Run Status",
    pr.totalPayout AS "Total Company Payout (₹)",
    pr.processedAt AS "Processed Date",
    u.firstName || ' ' || u.lastName AS "Dispatched By"
FROM "PayrollRun" pr
LEFT JOIN "User" u ON pr.processedById = u.id
ORDER BY pr.year DESC, pr.month DESC;
```

### 5.3 Individual Payslip Records generated in a Payroll Run
* **Kyu aur Kab use karein?** Employee payslip generation check karne ke liye.
```sql
SELECT 
    pe.payslipNumber AS "Payslip #",
    u.employeeCode AS "Emp Code",
    u.firstName || ' ' || u.lastName AS "Employee Name",
    pe.baseSalary AS "Basic",
    pe.grossSalary AS "Gross",
    pe.totalDeductions AS "Total Deductions",
    pe.netSalary AS "Net Take-Home",
    pe.status AS "Payment Status"
FROM "PayrollEntry" pe
JOIN "User" u ON pe.userId = u.id
ORDER BY pe.createdAt DESC
LIMIT 50;
```

---

## Module 6: Internal Webmail System (Inbox, Sent & Unread)

### 6.1 Har Employee ke Inbox me kitne Unread Mails hain
* **Kyu aur Kab use karein?** Webmail badge notification update karne aur unread counts calculate karne ke liye.
```sql
SELECT 
    u.email AS "User Email",
    u.firstName || ' ' || u.lastName AS "User Name",
    COUNT(r.id) AS "Unread Mails"
FROM "User" u
LEFT JOIN "InternalEmailRecipient" r ON u.id = r.recipientId AND r.isRead = 0 AND r.folder = 'INBOX'
GROUP BY u.id, u.email, u.firstName, u.lastName
HAVING "Unread Mails" > 0
ORDER BY "Unread Mails" DESC;
```

### 6.2 Sent Emails aur unke Delivery Status
* **Kyu aur Kab use karein?** Internal official communication logs audit karne ke liye.
```sql
SELECT 
    e.id AS "Email ID",
    sender.email AS "From",
    e.subject AS "Subject",
    e.sentAt AS "Timestamp",
    recip_user.email AS "Delivered To",
    CASE WHEN recip.isRead = 1 THEN 'Read' ELSE 'Unread' END AS "Read Status",
    recip.readAt AS "Read Timestamp"
FROM "InternalEmail" e
JOIN "User" sender ON e.senderId = sender.id
JOIN "InternalEmailRecipient" recip ON e.id = recip.emailId
JOIN "User" recip_user ON recip.recipientId = recip_user.id
ORDER BY e.sentAt DESC
LIMIT 30;
```

---

## Module 7: Task Management & Assignments

### 7.1 Pending & In-Progress Tasks with Assignees and Due Dates
* **Kyu aur Kab use karein?** Project task boards aur team deliverables monitor karne ke liye.
```sql
SELECT 
    t.id AS "Task ID",
    t.title AS "Task Title",
    t.priority AS "Priority (LOW/MED/HIGH/URGENT)",
    t.status AS "Status",
    t.dueDate AS "Deadline",
    creator.firstName || ' ' || creator.lastName AS "Created By",
    COALESCE(assignee.firstName || ' ' || assignee.lastName, 'Unassigned') AS "Assigned To"
FROM "Task" t
LEFT JOIN "User" creator ON t.creatorId = creator.id
LEFT JOIN "TaskAssignee" ta ON t.id = ta.taskId
LEFT JOIN "User" assignee ON ta.userId = assignee.id
WHERE t.status != 'COMPLETED'
ORDER BY 
    CASE t.priority 
        WHEN 'URGENT' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        ELSE 4 
    END,
    t.dueDate ASC;
```

### 7.2 Overdue Tasks (Jinka Deadline nikal chuka hai)
* **Kyu aur Kab use karein?** Escalation reports aur delayed task follow-ups ke liye.
```sql
SELECT 
    t.title AS "Task Title",
    t.priority AS "Priority",
    t.dueDate AS "Due Date",
    u.firstName || ' ' || u.lastName AS "Assignee",
    u.email AS "Assignee Email"
FROM "Task" t
JOIN "TaskAssignee" ta ON t.id = ta.taskId
JOIN "User" u ON ta.userId = u.id
WHERE t.status != 'COMPLETED' AND t.dueDate < date('now')
ORDER BY t.dueDate ASC;
```

---

## Module 8: Employee Lifecycle (Onboarding & Exit Offboarding)

### 8.1 New Hire Onboarding Checklist Progress
* **Kyu aur Kab use karein?** Naye employees ki joining ke samay IT asset handover, document collection aur account creation status check karne ke liye.
```sql
SELECT 
    u.employeeCode AS "Emp Code",
    u.firstName || ' ' || u.lastName AS "New Joiner",
    ot.title AS "Onboarding Step",
    ot.category AS "Department Responsible",
    CASE WHEN ot.isCompleted = 1 THEN '✅ Completed' ELSE '⏳ Pending' END AS "Status",
    ot.completedAt AS "Completed Date"
FROM "OnboardingTask" ot
JOIN "User" u ON ot.userId = u.id
ORDER BY u.employeeCode ASC, ot.isCompleted ASC;
```

### 8.2 Resignation, Notice Period & Exit Clearances
* **Kyu aur Kab use karein?** Employee resignation, last working day aur clearance tracking ke liye.
```sql
SELECT 
    u.employeeCode AS "Emp Code",
    u.firstName || ' ' || u.lastName AS "Employee",
    er.resignationDate AS "Resignation Submitted",
    er.lastWorkingDate AS "LWD (Last Working Day)",
    er.noticePeriodDays AS "Notice Days",
    er.status AS "Exit Status",
    er.reason AS "Separation Reason",
    er.itClearance AS "IT Assets Returned?",
    er.financeClearance AS "Finance & Accounts Settled?"
FROM "ExitRecord" er
JOIN "User" u ON er.userId = u.id
ORDER BY er.lastWorkingDate ASC;
```

---

## Module 9: Recruitment / ATS (Jobs, Candidates & Interviews)

### 9.1 Open Job Positions & Total Applicants Count
* **Kyu aur Kab use karein?** Recruitment pipeline aur active job listings ka status dekhne ke liye.
```sql
SELECT 
    j.title AS "Job Position",
    d.name AS "Department",
    j.location AS "Location",
    j.type AS "Type (FullTime/Contract)",
    j.status AS "Posting Status",
    COUNT(ja.id) AS "Total Applicants"
FROM "JobOpening" j
JOIN "Department" d ON j.departmentId = d.id
LEFT JOIN "JobApplication" ja ON j.id = ja.jobOpeningId
GROUP BY j.id, j.title, d.name, j.location, j.type, j.status
ORDER BY "Total Applicants" DESC;
```

### 9.2 Scheduled Interviews with Interviewers & Candidates
* **Kyu aur Kab use karein?** Daily interview schedules aur candidate evaluations track karne ke liye.
```sql
SELECT 
    c.fullName AS "Candidate Name",
    c.email AS "Candidate Email",
    j.title AS "Interviewing For",
    i.roundName AS "Interview Round", 
    i.scheduledAt AS "Date & Time",
    i.status AS "Interview Status",
    interviewer.firstName || ' ' || interviewer.lastName AS "Interviewer"
FROM "Interview" i
JOIN "JobApplication" ja ON i.applicationId = ja.id
JOIN "Candidate" c ON ja.candidateId = c.id
JOIN "JobOpening" j ON ja.jobOpeningId = j.id
JOIN "User" interviewer ON i.interviewerId = interviewer.id
ORDER BY i.scheduledAt DESC;
```

---

## Module 10: Asset Allocation & Document Management

### 10.1 Company Assets & unka Allocation Status (Laptops, Monitors, Phones)
* **Kyu aur Kab use karein?** IT asset inventory management me dekhne ke liye ki kaunsa laptop kiske paas assigned hai.
```sql
SELECT 
    a.assetTag AS "Asset Tag",
    a.name AS "Device Name",
    a.category AS "Category",
    a.serialNumber AS "Serial #",
    a.status AS "Asset Status",
    COALESCE(u.firstName || ' ' || u.lastName, 'Available in IT Stock') AS "Currently Assigned To",
    COALESCE(u.employeeCode, '-') AS "Emp Code"
FROM "Asset" a
LEFT JOIN "AssetAssignment" aa ON a.id = aa.assetId AND aa.returnedAt IS NULL
LEFT JOIN "User" u ON aa.userId = u.id
ORDER BY a.category ASC, a.name ASC;
```

### 10.2 Employee Uploaded Documents (Aadhar, PAN, Degree, Contracts)
* **Kyu aur Kab use karein?** HR compliance audit me verify karne ke liye ki employee ne required identity documents upload kiye hain ya nahi.
```sql
SELECT 
    u.employeeCode AS "Emp Code",
    u.firstName || ' ' || u.lastName AS "Employee",
    doc.name AS "Document Title",
    doc.category AS "Category",
    doc.fileUrl AS "File Storage Path",
    doc.createdAt AS "Uploaded On"
FROM "Document" doc
JOIN "User" u ON doc.uploadedById = u.id
ORDER BY doc.createdAt DESC;
```

---

## Module 11: Security, Audit Trail & System Activity

### 11.1 Real-Time Security Audit Logs (Kisne kab kya action kiya)
* **Kyu aur Kab use karein?** Security audits, unauthorized changes ya compliance inspection ke liye.
```sql
SELECT 
    al.createdAt AS "Timestamp",
    u.email AS "Actor (Performed By)",
    al.action AS "Action (e.g. UPDATE_SALARY, CLOCK_IN)",
    al.entity AS "Target Entity",
    al.entityId AS "Record ID",
    al.ipAddress AS "Client IP",
    al.details AS "Detailed Payload"
FROM "AuditLog" al
LEFT JOIN "User" u ON al.userId = u.id
ORDER BY al.createdAt DESC
LIMIT 50;
```

### 11.2 Locked Accounts / Failed Login Attempts
* **Kyu aur Kab use karein?** Brute-force attacks ya security lockouts dekhne ke liye.
```sql
SELECT 
    employeeCode AS "Emp Code",
    firstName || ' ' || lastName AS "Name",
    email AS "Email",
    failedLoginAttempts AS "Failed Attempts",
    lockedUntil AS "Locked Until",
    lastLoginAt AS "Last Login At"
FROM "User"
WHERE failedLoginAttempts > 0 OR lockedUntil IS NOT NULL;
```

---

## Module 12: Executive Analytics & MIS Reports (Aggregations)

### 12.1 Company-Wide Attendance KPI Summary (Present, Late, Work From Home)
* **Kyu aur Kab use karein?** Management dashboard par company-wide attendance percentage nikalne ke liye.
```sql
SELECT 
    a.date AS "Date",
    COUNT(a.id) AS "Total Punches",
    SUM(CASE WHEN a.status = 'PRESENT' AND a.isLate = 0 THEN 1 ELSE 0 END) AS "On-Time Office",
    SUM(CASE WHEN a.isLate = 1 THEN 1 ELSE 0 END) AS "Late Arrivals",
    SUM(CASE WHEN a.workType = 'REMOTE' THEN 1 ELSE 0 END) AS "Work From Home",
    ROUND(AVG(a.totalHours), 2) AS "Avg Working Hours"
FROM "Attendance" a
GROUP BY a.date
ORDER BY a.date DESC
LIMIT 15;
```

### 12.2 Department-wise Total Payroll Expense Analysis
* **Kyu aur Kab use karein?** CFO / Finance report me dekhne ke liye ki kis department me monthly kitna salary expense hota hai.
```sql
SELECT 
    COALESCE(d.name, 'Unassigned') AS "Department",
    COUNT(u.id) AS "Employee Count",
    ROUND(SUM(s.baseSalary), 2) AS "Total Basic (₹)",
    ROUND(SUM(s.netSalary), 2) AS "Total Monthly Net Payout (₹)",
    ROUND(AVG(s.netSalary), 2) AS "Average Salary (₹)"
FROM "User" u
JOIN "SalaryStructure" s ON u.id = s.userId
LEFT JOIN "Department" d ON u.departmentId = d.id
WHERE u.status = 'ACTIVE'
GROUP BY d.name
ORDER BY "Total Monthly Net Payout (₹)" DESC;
```

---

## Module 13: Quick Troubleshooting & Emergency DB Fixes

### 13.1 Kisi Employee ka Password manually Reset karna
* **Kyu aur Kab use karein?** Agar koi employee login na kar pa raha ho aur uska password turant `password123` karna ho.
*(Note: Ye bcrypt hash hai for `password123`: `$2a$10$w8uM6m3y2K6Msqv3J/m3t.F9kFvU2F...`)*
```sql
-- Employee ka failed attempts 0 karke unlock karna
UPDATE "User"
SET 
    failedLoginAttempts = 0,
    lockedUntil = NULL,
    status = 'ACTIVE'
WHERE email = 'employee@nexus.com';
```

### 13.2 Pending Leave ko Emergency Approve karna (Direct SQL)
* **Kyu aur Kab use karein?** Agar Manager portal unavailable ho aur urgently leave approve karni ho.
```sql
UPDATE "LeaveRequest"
SET 
    status = 'APPROVED',
    updatedAt = CURRENT_TIMESTAMP
WHERE id = 'PASTE_LEAVE_REQUEST_ID_HERE';
```

### 13.3 Test Punches ya Invalid Attendance Record Delete karna
* **Kyu aur Kab use karein?** Testing ke time banaye gaye duplicate ya galat punches ko clean karne ke liye.
```sql
DELETE FROM "Attendance"
WHERE date = '2026-09-24' AND userId = (SELECT id FROM "User" WHERE email = 'test@nexus.com');
```

---

## 💡 Pro Tips for Executing Queries:
1. **Case-Sensitivity**: SQLite me table names quotes me likhna safe rehta hai (e.g. `FROM "User"`).
2. **String Functions**: SQLite me do strings ko jodane ke liye `||` operator use hota hai (e.g. `firstName || ' ' || lastName`).
3. **Current Date**: SQLite me aaj ki date nikalne ke liye `date('now')` use karein.
4. **Transactions**: Koi bhi bada `UPDATE` ya `DELETE` chalane se pehle `BEGIN TRANSACTION;` aur baad me `COMMIT;` karein taaki galti hone par `ROLLBACK;` kiya ja sake.
