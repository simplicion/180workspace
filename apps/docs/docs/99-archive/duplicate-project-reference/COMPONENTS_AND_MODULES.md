> *Last verified against Postgres schema migration (July 2026)*

# Components and Modules

## Overview
The UI utilizes a highly composed structure within `frontend/components/`. Components are broken down functionally to serve global utility flows or feature-specific modular data tables. 

## List of Major Components
### 1. Global / Shared Elements
*   **GlobalSearch.tsx**: Unified indexing component mapping keypress commands (`CMD+K`) to jump across pages or records instantly.
*   **FileUploadModal.tsx**: Cloudinary/S3 hooked droplet zone supporting chunked uploads and permission handling.
*   **UserSelectionModal.tsx**: Repeatedly used whenever ownership (reassigning a task, adding a project member) needs to shift.
*   **ConfirmModal.tsx & Skeleton.tsx**: Standardized UI wrappers preventing accidental destructive user actions and providing smooth hydrated loading states.

### 2. Dashboard / Module Specific
*   **dashboard/EmployeeDashboard**: Conditionally rendered interface isolating data exclusively for the `employee` role vs standard generic dashboards.
*   **documents/TemplatesListModal.tsx**: E-signature and text generation scaffolding.
*   **hr/PayslipModal.tsx**: PDF renderer rendering strict accounting output.
*   **settings/CompanyTab.tsx**: Modifies the root system configuration logic for a company.

## Component Relationships
Components generally rely on their parent Next.js `page.tsx` elements to dispatch API queries (via `axios`). The fetched data is drilled down as React Props to the components.
For heavy-interaction models (like `TaskDetailModal.tsx` and `CreateProjectModal.tsx`), the components themselves contain internal `useEffect` lifecycles pulling relational data (like fetching a list of available `employees` to populate a dropdown grid dynamically).

## Reusability Analysis
The frontend takes a declarative UI approach (Tailwind CSS).
- Extensive reusability is seen with modal engines (e.g., `AddEmployeeModal`, `CreateTaskModal`).
- The system prevents prop-drilling by managing overarching navigation state via global bindings and limiting deeply nested child states.
- **Optimization Consideration**: Several components use complex inline ternary operations and raw `<img>` tags which, while highly reusable, could negatively impact Core Web Vitals on scaled data-tables.
