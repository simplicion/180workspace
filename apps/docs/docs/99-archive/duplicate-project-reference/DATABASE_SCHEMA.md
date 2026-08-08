> *Last verified against Postgres schema migration (July 2026)*

# Database Schema

## Overview
The application persists data to a PostgreSQL Relational Database using the **Prisma ORM**. There are currently 85 structured models defined in `packages/db/prisma/schema.prisma`, managing everything from hierarchical company structures to operational delivery and financial records.

## Company Data Isolation Pattern
Almost every operational model shares a foundational Multi-company mechanism:
- `companyId String` (with a relation to `Company` and a database index)
When a user queries data, the backend logic injects this `companyId` into all database operations to ensure Cross-Company leakage is impossible.

## Key Tables / Models
### 1. User & Identity
*   **User**: Handles login, roles (Employee, Admin, etc.), designations. References `companyId`. Contains fields for standard HR data as well as social/profile data.
*   **Company**: The core company model. Contains subscription, settings, and business profile information.
*   **Client**: External B2B connection accounts tied to the CRM.

### 2. Operational Delivery
*   **Project**: 
    - *Fields:* Name, status, priority, progress, deadline.
    - *Relationships:* `companyId`, `tasks`, `invoices`, `expenses`, `goals`, `milestones`.
*   **Task**: Linked primarily to Projects ensuring isolated workflows.
*   **CalendarEvent** & **MeetingLog**: Shared scheduling entities.

### 3. Financial & HR
*   **Invoice / Expense**: High precision numbers bound to accounts and clients.
*   **Salary**: Immutable snapshot mapping a User Object against a payroll timeframe.
*   **Leave**: Tracks PTO workflows requiring dual state shifts (Requested -> Approved).

### 4. Audit & Telemetry
*   **AuditLog**: Massive analytical datasets recording time traces, user endpoints, API hit sizes, and modification traces. 

## Data Flow between Client & DB
1. **Frontend** POSTs a `project` creation JSON object. 
2. **Backend Services** intercept this, inject the current timestamp and the JWT's `companyId`.
3. **Prisma Client** validates the schema payload and enum restrictions.
4. The DB write is confirmed, and an `AuditLog` record is spawned asynchronously in parallel.
