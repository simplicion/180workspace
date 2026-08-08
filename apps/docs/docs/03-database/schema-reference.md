# Database Schema

## Overview
The application persists data to a PostgreSQL NoSQL Document Store using the **Prisma ORM**. There are over 40 structured collections defined in `backend/src/models/`, managing everything from hierarchical company structures to highly fragmented chat logs.

## Company Data Isolation Pattern
Almost every model shares a foundational Multi-company mechanism:
- `companyId: { type: prisma.Schema.Types.ObjectId, ref: 'Company', index: true }`
When a user queries data, the backend middleware injects this `companyId` into all database operations to mathematically verify that Cross-Company leakage is impossible.

## Key Tables / Collections
### 1. User & Identity
*   **User**: Handles login, roles (Admin, Manager, Developer), status strings (active, internal). References `companyId`.
*   **Client**: External B2B connection accounts tied to the CRM.

### 2. Operational Delivery
*   **Project**: 
    - *Fields:* Name, status (enum), priority, progress, deadline.
    - *Relationships:* `ownerId` (User), `clientIds` (Array of Client refs), `memberIds` (Array of User refs).
    - *Behavior:* Enforces soft deletes using a pre-find middleware (`this.where({ deletedAt: null })`).
*   **Task**: Linked primarily to Projects ensuring isolated workflows.
*   **CalendarEvent** & **MeetingLog**: Shared scheduling entities.

### 3. Financial & HR
*   **Invoice / VendorBill / Expense**: High precision numbers bound to accounts and clients.
*   **Salary**: Immutable snapshot mapping a User Object against a payroll timeframe.
*   **Leave**: Tracks PTO workflows requiring dual state shifts (Requested -> Approved).

### 4. Audit & Telemetry
*   **AuditLog / ActivityLog**: Massive analytical datasets recording time traces, user endpoints, API hit sizes, and modification traces. These lack deep foreign-key linkage intentionally to preserve history even if base objects are purged.

## Data Flow between Client & DB
1. **Frontend** POSTs a `project` creation JSON object. 
2. **Backend Services** intercept this, inject the current timestamp and the JWT's `companyId`.
3. **Prisma Schema** validates `enum` restrictions (e.g., ensuring `priority` is only 'low', 'medium', 'high', 'critical').
4. The DB write is confirmed, and an `ActivityLog` object is spawned asynchronously in parallel.
