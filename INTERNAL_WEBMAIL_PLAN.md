# Lexvera Enterprise HRMS - In-App Internal Webmail Specification & Implementation Plan

---

## 1. Executive Summary & Concept Overview

### 1.1 What is "In-App Internal Webmail"?
In-App Internal Webmail is a dedicated, enterprise-grade communication system built directly inside the Lexvera HRMS portal. It provides every employee, manager, and administrator with their own **Official Company Email Address** (e.g., `rahul.verma@lexvera.internal` or `rahul.verma@lexvera.com`).

Unlike external email providers (Gmail, Outlook) that require monthly per-user subscription fees and DNS/MX server configurations, this system runs securely on our internal architecture:
- **Zero Third-Party Cost:** No per-seat billing from Google Workspace or Microsoft 365.
- **100% Secure & Isolated:** Company communication stays strictly within the organization—no external spam, phishing, or leaked company secrets.
- **Deep HRMS Integration:** Leave approvals, attendance regularizations, policy updates, and broadcast announcements are delivered directly into the employee's official inbox as formatted corporate emails.

---

## 2. Official Email Generation Logic (Onboarding Flow)

When an Admin adds a new employee (manually or via Bulk CSV Import):

### 2.1 Email Handle Formulation Rule
1. **Standard Pattern:** `firstName.lastName@lexvera.internal` (all lowercase, accents/special characters removed).
2. **Duplicate Conflict Resolution:**
   - If `rahul.verma@lexvera.internal` already exists:
     - Check `rahul.verma1@lexvera.internal`, `rahul.verma2@...`, etc.
   - System automatically picks the next available unique handle.
3. **Single Name Handling:**
   - If only first name is provided (e.g., `Amit`):
     - Pattern: `amit.emp<EmployeeID>@lexvera.internal` or `amit@lexvera.internal`.

### 2.2 Dual-Email Architecture
Every user profile will maintain two distinct email fields:
| Field Name | Type | Purpose | Visibility |
| :--- | :--- | :--- | :--- |
| `personalEmail` | External Email | Password recovery, initial invite, emergency contact (e.g., `rahul@gmail.com`) | HR & Employee only |
| `officialEmail` | Internal Email | Daily HRMS work, in-app messaging, official correspondence (`rahul.verma@lexvera.internal`) | Company-wide directory |

---

## 3. Webmail Feature Suite & User Experience (UX)

### 3.1 Mailbox Folders
1. **📥 Inbox:** All incoming emails received from colleagues, managers, HR, and automated system notifications. Unread badge count shown in real-time.
2. **⭐ Starred:** Fast access to flagged/bookmarked important emails.
3. **📤 Sent:** All emails successfully dispatched by the user.
4. **📝 Drafts:** Automatically saved unfinished emails.
5. **🗑️ Trash:** Deleted emails (recoverable for 30 days or permanently deletable).
6. **📢 Official Announcements:** Filtered view for company-wide HR broadcasts.

### 3.2 Key Webmail Actions & Capabilities
* **Smart Autocomplete Recipient Search:**
  - Typing in `To:`, `Cc:`, or `Bcc:` opens a dropdown showing matching employees with their photo, role, department, and official email.
* **Rich-Text Composer:**
  - Formatting bar: Bold, Italic, Underline, Bullet points, Numbered lists, Hyperlinks, Code blocks, and Headings.
* **File Attachments:**
  - Support for uploading PDFs, DOCX, XLSX, PNG, and JPG (up to 10MB per email).
* **Conversation Threading:**
  - Related emails grouped by Subject line (`Re: Leave Application for Diwali`) so users can see full conversation history in one view.
* **Reply, Reply-All, & Forward:**
  - 1-click response preserving previous conversation block and recipient lists.
* **Search & Filters:**
  - Instant client-side search by Sender, Subject, Date, or keyword content.

---

## 4. Automated HR Triggers as Official Emails

The Webmail system seamlessly bridges HRMS actions with email delivery:

| Trigger Event | Sender Display | Subject Format | Contents |
| :--- | :--- | :--- | :--- |
| **New Employee Welcome** | `Lexvera HR System <hr@lexvera.internal>` | *Welcome to Lexvera Enterprise HRMS!* | Employee code, designation, manager name, policy guide link. |
| **Leave Application Status** | `HR Leaves Desk <leaves@lexvera.internal>` | *Leave Request Approved: [Date]* | Status change, remaining leave balance, manager remarks. |
| **Attendance Regularization** | `Attendance Desk <attendance@lexvera.internal>` | *Regularization Update for [Date]* | Approval / rejection notification with supervisor comments. |
| **Company Broadcast** | `Admin / HR Broadcast <announcements@lexvera.internal>` | *[Company Announcement] Title* | Rich HTML broadcast notice delivered to all active mailboxes. |
| **Timesheet Reminder** | `Operations Desk <timesheets@lexvera.internal>` | *Reminder: Pending Timesheet Submission* | Weekly hours status and link to log hours. |

---

## 5. Technical Architecture & Database Schema

### 5.1 MongoDB Models

#### Model 1: `InternalEmail` (`server/src/models/InternalEmail.ts`)
```typescript
interface IInternalEmail {
  threadId: string;                     // For grouping conversation replies
  sender: {
    userId: ObjectId;
    name: string;
    officialEmail: string;
    role: string;
    avatar?: string;
  };
  recipients: {
    to: Array<{ userId: ObjectId; name: string; officialEmail: string }>;
    cc?: Array<{ userId: ObjectId; name: string; officialEmail: string }>;
    bcc?: Array<{ userId: ObjectId; name: string; officialEmail: string }>;
  };
  subject: string;
  body: string;                         // Sanitized HTML content
  attachments: Array<{
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
  }>;
  isSystemEmail: boolean;               // True if auto-generated by HRMS
  category?: 'general' | 'leave' | 'attendance' | 'announcement' | 'policy';
  
  // Per-recipient mailbox states (Inbox, Read, Starred, Trash)
  recipientStates: Array<{
    userId: ObjectId;
    isRead: boolean;
    readAt?: Date;
    isStarred: boolean;
    isArchived: boolean;
    isTrash: boolean;
    trashedAt?: Date;
  }>;

  // Sender state (for Sent / Drafts / Trash)
  senderState: {
    isDraft: boolean;
    isStarred: boolean;
    isTrash: boolean;
    trashedAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}
```

---

## 6. Backend API Routes (`server/src/modules/mail/`)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/mail/inbox` | Get paginated inbox emails with unread count |
| `GET` | `/api/v1/mail/sent` | Get all sent emails |
| `GET` | `/api/v1/mail/starred` | Get starred emails |
| `GET` | `/api/v1/mail/drafts` | Get saved drafts |
| `GET` | `/api/v1/mail/trash` | Get trashed emails |
| `GET` | `/api/v1/mail/:id` | Read a specific email and mark `isRead: true` |
| `POST` | `/api/v1/mail/send` | Send email (supports `to`, `cc`, `bcc`, attachments) |
| `POST` | `/api/v1/mail/draft` | Save or update a draft |
| `PATCH` | `/api/v1/mail/:id/star` | Toggle starred status |
| `PATCH` | `/api/v1/mail/:id/trash` | Move to trash / restore from trash |
| `DELETE` | `/api/v1/mail/:id` | Permanently delete from trash |
| `GET` | `/api/v1/mail/directory` | Search active company directory for autocomplete |
| `GET` | `/api/v1/mail/unread-count` | Lightweight endpoint for topbar notification badge |

---

## 7. Frontend User Interface Layout (`client/src/views/WebmailView.tsx`)

A sleek, responsive, Gmail-inspired interface designed using Tailwind CSS:

1. **Left Sidebar (Navigation):**
   - **`+ Compose` Primary Button** (with floating plus icon).
   - Folders list: Inbox (with unread badge), Starred, Sent, Drafts, Trash.
   - Storage / stats indicator.
2. **Middle List (Email Listing):**
   - Search bar at top.
   - Tabs: All, Unread, System Alerts.
   - Select all checkbox, Mark as Read, Delete batch action toolbar.
   - Email preview items: Sender name, avatar, Subject, snippet preview, paperclip icon (if attachments exist), timestamp.
3. **Right Pane (Email Reader & Thread):**
   - Full header with sender details, recipient badges, and date.
   - Clean formatted email body.
   - Downloadable attachment pills.
   - Quick "Reply" and "Forward" action buttons at bottom.
4. **Compose Modal:**
   - Pop-up or docked bottom-right modal (like modern Gmail/Outlook).
   - Minimizable and full-screen expandable.

---

## 8. Role-Based Access & Governance

| Capability | Employee | Manager | Admin / HR Admin |
| :--- | :---: | :---: | :---: |
| Send 1-to-1 Email | Yes | Yes | Yes |
| Send to entire Department | No | Yes (Own Dept) | Yes (Any Dept) |
| Company-wide All-Hands Broadcast | No | No | Yes |
| Delete own received/sent emails | Yes | Yes | Yes |
| Access Audit / Compliance Archive | No | No | Yes |

---

## 9. Phased Implementation Roadmap

### Phase 1: Database & Core Service Setup
- Create `InternalEmail` schema and index queries (`recipientStates.userId`, `createdAt`).
- Implement utility function `generateOfficialEmail(firstName, lastName)` with auto-increment duplicate prevention.
- Add `officialEmail` generation trigger inside `employeeController.ts` (Add Employee and Bulk CSV Import).

### Phase 2: Mail REST APIs & Notification Integration
- Build controller methods for Send, Inbox, Sent, Drafts, Star, Trash, and Directory Search.
- Create internal notification bridge: whenever Leave is approved or Announcement is posted, automatically call `mailService.sendSystemEmail()`.

### Phase 3: Frontend Webmail UI & Topbar Badge
- Build `WebmailView.tsx` with modern email client aesthetics (Sidebar, Mail List, Reader, and Compose Dialog).
- Add "Webmail" link with real-time unread badge in main sidebar and top header.

### Phase 4: Future Extensibility (Optional Real SMTP/IMAP)
- The architecture is built modularly so that in the future, if the company connects a live domain (e.g. `lexvera.com`), the same UI can send via real SMTP (Nodemailer) and receive via IMAP without redesigning the frontend.
