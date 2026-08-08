> *Last verified against Postgres schema migration (July 2026)*

# Routing and Pages

## Overview
The 180workspace platform delegates routing uniquely depending on the environment. The Next.js 14 App Router fundamentally drives all frontend views via the `/app` directory paradigm.

## Route Hierarchy
### Public Routes
These routes bypass heavy company validation to allow access for incoming leads and administrative logons.
*   `/` (Root Landing Page)
*   `/login` (Platform entry gate, OAuth, and credential processing)
*   `/signup` (SaaS boarding workflow)
*   `/forgot-password` (Integrated modal state in login/signup flows)

### Authenticated Domain Routes (`/dashboard/*`)
Wrapped completely by a generic `<DashboardLayout>` which ensures strict authenticated validation and draws the standard Navigation components.
*   `/dashboard/admin` (CEO/Board level Insights)
*   `/dashboard/activity` (Global audit tracking across modules)
*   `/dashboard/projects` & `/dashboard/tasks` (Standard project mapping)
*   `/dashboard/sales/*` (Granular CRM tooling: Leads, Pipeline, Accounts, Opportunities, Quotes)
*   `/dashboard/finance/*` (Financial Ops: Invoices, Expenses, Bills, Salary LEDGER)
*   `/dashboard/hr/*` (Internal management: Employees, Attendance, Reviews)
*   `/dashboard/settings/*` (Workspace/Company config rules and custom apps)

### Super Administrator Routes (`/superadmin/*`)
A tightly isolated zone mapped only to the platform maintainers, distinct from company-company admins.
*   `/superadmin/companies`
*   `/superadmin/users`
*   `/superadmin/subscriptions`
*   `/superadmin/tickets`

## Navigation Structure
The primary UX is governed by `lib/navigation.ts`, an array describing left-pane modules, icons (`lucide-react`), and URL mappings. 
This file defines dynamic grouping headers (e.g. `CRM & Sales`, `HR Management`, `Productivity`) keeping a massive feature set organized.

## Access Control (Public vs Private)
**Next.js Middleware vs Backend Guarding:**
- Next.js acts as an optimistic UI blocker. If `userRoles` inside `navigation.ts` doesn't include the current session's designation (e.g., `'admin', 'manager', 'hr', 'employee'`), the UI element is stripped.
- The Express Backend operates an impenetrable hardline. Any API calls hitting the REST interface must pass through `protect` (which decodes the JWT) and `moduleGuard(moduleString)` middleware. Simply guessing the Next.js route URL will result in an empty API return (401/403 HTTP status) even if the page partially loads.
