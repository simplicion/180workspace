> *Last verified against Postgres schema migration (July 2026)*

# Folder Structure

## Complete Breakdown

The 180workspace repository relies on a standard Monorepo pattern (separated by folders rather than heavy native workspaces).

```text
/ims-platform/
│
├── frontend/                          # Next.js React Application
│   ├── app/                           # Next.js 14+ App Router Logic
│   │   ├── dashboard/                 # Enclosed layout for authenticated routes
│   │   ├── login/                     # Authentication views
│   │   └── superadmin/                # Platform-operator management views
│   ├── components/                    # Global React Components
│   │   ├── dashboard/                 # Specific layout components for the dashboard
│   │   ├── documents/                 # Specialized modal/UI views
│   │   └── settings/                  # System configuration views
│   ├── lib/                           # Utility scripts and shared constants
│   │   └── navigation.ts              # Hierarchical arrays drawing the Left-Sidebar
│   ├── next.config.js                 # Next.js build compilation params
│   └── tailwind.config.js             # PostCSS / Tailwind CSS design system rules
│
└── backend/                           # Node.js Express API
    ├── server.js                      # Root application entry-point and port binding
    └── src/
        ├── config/                    # Database, Redis, and Gateway keys
        ├── controllers/               # Business Logic matching API surface
        ├── middleware/                # Route Guards, Company-Scoping, Validation
        ├── models/                    # Prisma ORM Schema mappings (40+ collections)
        ├── routes/                    # Express Router path generation (index.routes.js)
        ├── seed/                      # PostgreSQL injection files for initial setup
        ├── services/                  # External network calls and Background Cron tasks
        └── sockets/                   # WebSocket Event handlers and broadcasting
```

## Responsibility of Major Modules

### Frontend
- **`app/` Folder:** Strictly dictates URL rendering. Server Components are used by default for maximum SEO and speed. Page components here handle raw data fetching while wrapping client components.
- **`components/` Folder:** Holds modular, interactive (mostly `"use client"`) elements like Modals, Tables, Input forms, and animated Framer Motion layouts.
- **`lib/`:** Contains static helpers such as API interceptors (`axios`), navigation objects, string manipulators, and local storage caches.

### Backend
- **`middleware/`:** Houses the crucial `company-db` module, which takes an incoming JWT, parses the user's `CompanyID`, and swaps the database execution context ensuring no cross-company data leakage exists.
- **`controllers/` & `services/`:** Kept cleanly separated. Controllers parse `req.body`, while services execute the heavy lifting logic to ensure services can be called via webhooks, internal routines, or API endpoints.
