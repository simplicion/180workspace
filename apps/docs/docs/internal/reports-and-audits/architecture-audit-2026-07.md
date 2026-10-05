# 180workspace180 Architecture Audit

## 1. Architecture Summary
180workspace180 is a multi-company monorepo architecture using Node.js/Express for the backend (`apps/http-backend`), Next.js for the frontend (`apps/user-web`), and an independent WebSocket backend (`apps/ws-backend`). It uses a single PostgreSQL database with logical company isolation via `companyId` injection using Prisma Extensions.

**Core Stack:**
- **Frontend:** Next.js (App Router + Pages), Redux Toolkit Query, Axios.
- **Backend:** Node.js, Express, Prisma ORM, PostgreSQL.
- **Realtime:** Socket.IO.
- **Workload Management:** BullMQ + Redis.

## 2. Runtime Process Map
- `http-backend`: Starts via `server.js`. Uses `RUN_MODE` (`api`, `worker`, `both`) to conditionally start the Express API or the background workers.
- `ws-backend`: Independent service for WebSocket connections.
- `user-web`: Standard Next.js dev process (`pnpm dev`).

## 3. Database/Company Architecture
- Single PostgreSQL database.
- Company isolation is enforced dynamically at runtime using `company-db.js`, which injects `companyId` into all queries via `prisma.$extends`.
- **Finding:** Previously, this extension was generated per-request, causing a massive memory leak and O(N) CPU overhead.

## 4. Authentication Flow
- JWT based (Access Token + Refresh Token).
- The frontend relied on independent interceptors (RTK Query, Axios, native fetch) which previously lacked a unified concurrency lock, leading to "stampedes" when a token expired.

## 5. WebSocket Flow
- The frontend instantiates Socket.IO via `lib/socket.ts`.
- **Finding:** A true singleton is correctly implemented at the module level. Consumers import `getSocket()` avoiding duplicate connections per browser session.

## 6. Module Authorization Flow
- Access to specific domains (HRMS, CRM, Finance) is guarded by `module-guard.js`.
- Checks `req.companyConfig.enabledApps` and `enabledModules`.
- **Finding:** The previous implementation failed *open* (allowing access) when configuration was missing or undefined.

## 7. Verified Issues

| ID | Severity | Area | Verified Issue | Evidence | Impact | Proposed Fix |
| -- | -------- | ---- | -------------- | -------- | ------ | ------------ |
| 1 | P0 | Database | Prisma `$extends` Memory Leak | `company-db.js` instantiated a new extension per request | Out of Memory, CPU spike | Pre-compute `GLOBAL_MODELS`, cache extended client per company |
| 2 | P0 | Database | Prisma Schema Drift | `Goal.assignedUser`, `Module.ownerId` queried but missing in schema | HTTP 500s on Dashboard/Goals endpoints | Update queries to match schema; add missing reverse relations |
| 3 | P0 | Auth | Token Refresh Stampede | Multiple independent API clients missing a shared Promise lock | 5+ simultaneous refresh requests on 401 | Implement `singleFlightRefresh` utility across all HTTP clients |
| 4 | P0 | Security | Module Guard Fail-Open | `Proceeding with caution` log when config is missing | Unauthorized company access | Rewrite guard to fail-closed (403/503) |
| 5 | P1 | Performance | Missing API Instrumentation | No timing data for slow queries in logs | Inability to track performance regressions | Add low-overhead `durationMs` to HTTP logger |

## 8. Suspected But Unverified Issues
- `Meilisearch` lifecycle might crash the server if the search engine is down (needs verification).
- Next.js development stability issues (`.next/routes-manifest.json` missing) caused by OneDrive sync interference.
- `Nodemon` watch scopes might be overly broad, causing infinite restart loops.

## 9. Fix Order
1. Fix Prisma `$extends` Leak (Completed)
2. Fix Prisma Schema Drift (Completed)
3. Fix Token Refresh Concurrency (Completed)
4. Fix Module Guard Security (Completed)
5. Add API Performance Instrumentation (Pending)
6. Optimize Slow APIs & ETag handling (Pending)
7. Audit Node.js Dev Stability & Nodemon (Pending)
8. Audit Optional Services Lifecycle (Pending)

## 10. Regression Risk
High. Modifying global company logic, authentication singletons, and core schema relations impacts every downstream feature. Regression testing of login, module access, and company isolation is mandatory.
