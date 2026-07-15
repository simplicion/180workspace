---
sidebar_position: 1
---

# Database & Core Domains

The `http-backend` uses PostgreSQL (via Prisma) and contains 46 distinct models. These models are grouped into logical business domains to support the massive feature set of the IMS Platform.

## 1. Core & Administration Domain
These models handle system-wide configuration, multi-tenancy, and security.
- **`User`**: Core authentication and identity model.
- **`CompanyConfig`**: Tenant-specific settings and branding.
- **`Settings`**: Global platform settings.
- **`TenantTransaction`**: Billing and subscription ledgers for a tenant.
- **`AuditLog`**: Tracks sensitive actions for compliance.

## 2. CRM & Sales Domain
Models managing client relationships and revenue generation.
- **`Client`**: Represents external customers or leads.
- **`ClientCommunication`**: Logs of emails, calls, and meetings with clients.
- **`Sales`**: Tracks deals and pipeline stages.
- **`Invoice`**: Financial records billed to clients.
- **`Expense` & `VendorBill`**: Tracks outgoing money.

## 3. Project Management Domain
The execution engine for the "Operating Dashboard".
- **`Project`**: The overarching initiative.
- **`Milestone`**: Key deliverables within a project.
- **`Task`**: Individual actionable items assigned to users.
- **`WorkLog` & `TimeLog`**: Tracking effort and billable hours on tasks.

## 4. HR & Team Domain
Internal team management and payroll.
- **`Attendance` & `Leave`**: Tracks employee presence and time off.
- **`Salary`**: Payroll and compensation records.
- **`Holiday`**: Company-wide non-working days.
- **`Onboarding`**: Checklists for new hires.

## 5. Job Hunter & Recruitment Domain
Used for the hiring ecosystem.
- **`JobOpportunity` & `Job`**: Open positions.
- **`JobCandidateProfile`**: Profiles of applicants.
- **`JobApplication`**: The link between a candidate and an opportunity.

## 6. Content & Operations Domain
- **`ContentCalendar` & `CalendarEvent`**: Scheduling and content planning.
- **`Asset` & `Document`**: File references stored in Cloudinary or Google Drive.
- **`ForumPost` & `ForumReply`**: Community Q&A modules.
- **`Review`**: Feedback and rating systems.

## 7. Automation & AI Domain
- **`AiRequestLog`**: Tracks usage of Groq/OpenAI/Gemini for billing and rate limiting.
- **`AutomationLog`**: Records of triggered workflows.
- **`Notification`**: In-app alerts for users.
