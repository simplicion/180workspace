> *Last verified against Postgres schema migration (July 2026)*

# System Architecture

## Overall Architecture
The 180workspace Platform utilizes a **Modular Monolith** pattern with clear separation of concerns between its layers. It employs a decoupled client-server model:
1.  **Frontend (Client/SSR):** Next.js 15+ application handling routing, presentation, and hydration.
2.  **Backend (API Server):** Node.js/Express.js application processing business logic, validation, and authentication.
3.  **Database (Persistence):** PostgreSQL Atlas handling storage with multitenant scaling.

## Frontend-Backend Interaction
The interaction relies on statless REST HTTP requests and stateful WebSocket channels:
- **HTTP REST:** Standardized JSON over HTTPS. Axios is utilized on the frontend with request interceptors attaching `Authorization: Bearer <token>` and `x-tenant-id` headers.
- **WebSockets:** Socket.IO namespaces connect the frontend client to the backend for real-time notification dispatches, instant messaging, and collaborative whiteboard/calendar events.

## Data Flow Diagrams
*Textual Representation of Primary Data Flow:*
```text
[ User / Browser ] 
        │
    (Next.js App Router / Server Actions / Client Fetching)
        │
[ Reverse Proxy / Load Balancer (Vercel/Hostinger) ]
        │
[ Express.js API Gateway ]
        ├── 1. Rate Limiting (express-rate-limit)
        ├── 2. Security (Helmet, CORS)
        ├── 3. Header Validation & Authentication (JWT Decoder)
        ├── 4. Tenant Context resolution (tenant-db middleware)
        │
[ Route Handlers (src/routes) ] 
        │
[ Controllers (src/controllers) ] -> [ Services / BullMQ ]
        │
[ Models (Prisma ORM) ]
        │
[ PostgreSQL Atlas (Tenant-Specific Database) ]
```

## Module-Level Architecture
- **Auth Module:** JWT generation, 2FA validation, password reset links.
- **Tenant Middleware:** Dynamically switches `prisma.connection` contexts per request to ensure data absolute isolation across companies.
- **HR & Operations Module:** Automates tracking models (Leaves, Salaries, Employees).
- **Core Operations Module:** Maps Inventories, Invoices, Projects, and CRM pipelines.

## Third-Party Integrations
- **Stripe / Razorpay:** Payment gateway integrations for vendor bills and subscription cycles.
- **Google Auth / APIs:** OAuth connections and Calendar sync.
- **Cloudinary / AWS S3:** Media CDN and blob storage for uploaded documents and assets.
- **Sentry:** Continuous error tracking and performance profiling injected into the Express pipeline.
- **OpenAI / Groq:** AI-driven document insights and automated analytics aggregations.

## Deployment Architecture
Based on system configuration files, the architecture utilizes a hybrid cloud deployment strategy:
- **Frontend Edge Deployment:** Next.js application designed to run on Vercel Edge networks utilizing caching, geographic routing, and Server-Side Rendering (SSR).
- **Backend Application Server:** Dockerized Node.js API server typically deployed on AWS EC2, Render, or Hostinger VPS containers.
- **Background Worker Nodes:** Standalone Node.js processes assigned purely to executing BullMQ tasks via Redis orchestration.
