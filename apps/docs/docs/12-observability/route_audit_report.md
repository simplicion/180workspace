# IMS System Route & Navigation Audit Report

**Date:** March 8, 2026
**Auditor:** Antigravity (Senior System Auditor)
**Project:** IMS SAAS Platform

---

## Executive Summary

A comprehensive audit of the IMS SAAS platform was performed to map the relationship between frontend pages, backend API routes, and user-facing sidebar navigation. The analysis revealed a robust core system but identified significant inconsistencies in visibility, several dead links in the primary navigation, and "orphan" features that are code-complete but inaccessible via the UI.

---

## 1. Page Inventory & Sidebar Visibility

The following table maps existing frontend components to their sidebar visibility and backend support.

| Feature Page | Frontend Route | Sidebar Link | Backend API Route | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Dashboard** | `/dashboard/admin` | Yes | `/api/superadmin` | ✅ Core |
| **HR & Payroll** | `/dashboard/hr` | Yes | `/api/salary`, `/api/leaves` | ✅ Core |
| **Projects** | `/dashboard/projects` | Yes | `/api/projects` | ✅ Core |
| **Clients** | `/dashboard/clients` | Yes | `/api/clients` | ✅ Core |
| **Attendance** | `/dashboard/attendance` | Yes | `/api/attendance` | ✅ Core |
| **Settings** | `/dashboard/settings` | Yes | `/api/settings` | ✅ Core |
| **Analytics** | `/dashboard/analytics` | **No** | `/api/analytics` | 🔍 Orphan |
| **Reports** | `/dashboard/reports` | **No** | `/api/audit`, `/api/finance` | 🔍 Orphan |
| **Documents** | `/dashboard/documents` | **No** | `/api/files` | 🔍 Orphan |
| **Emails** | `/dashboard/emails` | **No** | `/api/emails` | 🔍 Orphan |
| **Help Center** | `/dashboard/docs` | **No** | N/A | 🔍 Orphan |
| **Meeting** | `/dashboard/meeting/[roomId]`| Yes (Partial) | `/api/meeting` | ⚠️ Broken |
| **Leaves (Direct)** | (Missing) | `/dashboard/leaves` | `/api/leaves` | ❌ Dead Link |
| **Holidays** | (Missing) | `/dashboard/holidays` | (Missing) | ❌ Dead Link |

---

## 2. Critical Observations

### 2.1 Dead Links in Sidebar
The primary sidebar (`frontend/app/dashboard/layout.tsx`) contains several links that will result in 404 errors for users:
*   **Leaves:** Links to `/dashboard/leaves`, but no dedicated page exists. Leave management logic is currently nested as a tab within the **HR & Payroll** (`/dashboard/hr`) page.
*   **Holidays:** Links to `/dashboard/holidays`. There is no corresponding `page.tsx` in the frontend and no `holidays` route definition in the backend.
*   **Meeting:** Links to `/dashboard/meeting`. While dynamic room routes exist (`/dashboard/meeting/[roomId]`), the index page for creating or joining meetings is missing.

### 2.2 Orphaned "Power" Features
Several high-value modules are implemented and connected to backend services but are **not accessible** through the standard sidebar:
*   **Analytics Module:** A complete dashboard with charting (`recharts`) and backend data fetching (`/api/analytics`).
*   **Reports Module:** Comprehensive reporting suite for attendance, payroll, and projects.
*   **Document Management:** A full UI for managing files, likely integrated with the `/api/files` backend.
*   **Email System:** A fully functional email client with history and AI-assisted drafting.

### 2.3 Backend Consistency
The backend architecture (`backend/src/routes/index.routes.js`) is highly consistent and covers almost all identified frontend features, including those currently orphaned. The only notable missing backend service is **Holidays**.

---

## 3. Recommendations (Architectural)

> [!IMPORTANT]
> To improve system integrity and user experience without modifying core logic:

1.  **Sidebar Alignment:** Update the sidebar navigation to point "Leaves" to `/dashboard/hr?tab=leaves` or implement a redirect in a Next.js middleware.
2.  **Enable Hidden Value:** Add sidebar entries for the **Analytics**, **Reports**, **Documents**, and **Emails** modules to expose existing functionality to the user.
3.  **Fix Feature Entry Points:** Create a base `page.tsx` for `/dashboard/meeting` to act as a portal for the dynamic room segments.
4.  **Clean Up:** Remove the "Holidays" sidebar entry until the module is implemented in both frontend and backend to avoid user frustration.

---

## 4. Technical Appendices

### 4.1 Frontend Filesystem Structure
The pages are located in: `frontend/app/dashboard/`
The layout/sidebar logic is in: `frontend/app/dashboard/layout.tsx`

### 4.2 Backend Route Registry
Routes are registered in: `backend/src/routes/index.routes.js`
Key middleware is located in: `backend/src/middleware/`

---
*End of Report*
