> *Last verified against Postgres schema migration (July 2026)*

# Business Logic

## Overview
The platform connects diverse operational endpoints into unified workflows. Major business logic does not exist piecemeal but operates as interconnected module pipelines.

## Core Workflows

### 1. CRM to Operational Execution Setup
- **Leads & Pipeline:** The Sales team inputs raw data points mapping to potential contracts (Deals). 
- **Transition to Project:** Once a quotation transforms into an active Account/Contract, backend generation pipelines automate the structural setup of a `Project` collection ensuring no manual re-keying is required, establishing immediate ownership IDs binding back to the initiating Account.

### 2. Time-Tracking against Payroll Architecture
- **Raw Inputs:** Employees log physical or project-mapped `TimeLog` and `Attendance` inputs.
- **Aggregation:** End-of-month backend CRON services compile all recorded time footprints to auto-generate corresponding `Salary` modules representing raw monetary debts. 
- **Invoicing Linkage:** Concurrently, if those timesheets mark billable B2B project hours, `Invoice.js` pipelines generate dynamic billing reports pointing securely back to the Client.

### 3. Company Subscription Lifecycle
- **Cron Service Checking:** A standalone `SubscriptionCronService` executes consistently scanning existing `Company` schemas. 
- **Dunning Management:** It calculates date deltas mapping to the company's paid SLA and dispatches sequential pre-warning emails mapping to eventual system lockouts if payments lapse (`SubscriptionExpiredWall` component).

## Key System Logic
*   **Virtual Reference Mapping:** Due to PostgreSQL NoSQL behavior, cross-module linkage happens heavily through mathematical array lookups (`memberIds`, `clientIds`).
*   **Soft Deletion Rules:** Removing a project doesn’t execute `db.collections.remove`. It assigns a `deletedAt: Date` timestamp. This preserves enterprise accounting integrity while making the UI element instantly vanish due to overarching Prisma `Pre-Find` constraints.

## Validation Rules
*   Prisma dictates extreme string typings via `enum` rules.
*   Zod validation checks external API inputs securing exact payload geometries before they touch the database.

## Critical Processes
*   **Audit Sub-System (Enterprise Activity Hub):** The most aggressive system feature. Triggers asynchronously binding massive, un-editable JSON logs detailing any `event`, `description`, `trigger`, and `stamp` directly corresponding to user mutations protecting against malicious insider deletion patterns.
