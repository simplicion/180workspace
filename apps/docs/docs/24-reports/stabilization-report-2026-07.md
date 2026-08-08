# Pitchin180 Stabilization Report (Phase 8-16)

## 1. Overview
This report documents the P1 Performance and Stability fixes applied to the Pitchin180 monorepo following the main architecture audit. The goal of this phase was to eliminate CPU-heavy bottlenecks, add visibility into API latency, and resolve development server instability.

## 2. API Performance Instrumentation (Phase 8)
- **Middleware Added:** `apps/http-backend/src/system-configs/middleware/system/performance.middleware.js`
- **Purpose:** Automatically measures the execution time of incoming requests. It captures the start time and checkpoints (e.g., `companyResolution`, `moduleGuard`). 
- **Behavior:** If a request exceeds the `SLOW_REQUEST_THRESHOLD_MS` environment variable (defaults to 500ms), a structured warning is emitted in the backend logs outlining the exact latency breakdown. This provides critical visibility without flooding production logs.

## 3. Profiling & Optimizing Slow Endpoints (Phase 9)
- **Finding:** The dashboard endpoints (`employee.controller.js` and `hrms.controller.js`) were already adequately utilizing `Promise.all` to fetch parallel datasets, avoiding top-level N+1 queries.
- **Fix 1 (Module N+1):** In `getModulesByProject`, an N+1 mapping loop was replaced with an optimized `include: { tasks: { where: { deletedAt: null } } }` query in Prisma, condensing multiple queries into a single database hit.
- **Fix 2 (Analytics Bug):** In `analytics.controller.js`, a critical bug was resolved where a string (`companyId`) was being passed into `FinancialAnalyticsService.getProjectProfitability` instead of the expected `req.prisma` object. This was causing a silent backend crash on the analytics dashboard.

## 4. ETag & Caching (Phase 10)
- **Analysis:** Express currently handles ETag generation by default via body hashing. While this saves bandwidth for `304 Not Modified` responses, it does *not* save database or CPU overhead because the ETag is computed *after* the entire JSON payload is generated.
- **Recommendation:** Due to the complexity of caching dynamic multi-company user permissions, relying on the existing Redis implementations (e.g., in `getFinancialStats`) is vastly superior to attempting to hijack early ETag headers.

## 5. Next.js & Nodemon Stability (Phase 11 & 12)
- **Issue:** The backend `pnpm dev` process was suffering from infinite restart loops. This happened because Nodemon was watching the entire monorepo, triggering a backend restart every time Next.js recompiled a frontend asset in `apps/user-web/.next`.
- **Fix:** A strict `nodemon.json` was added to `apps/http-backend` that explicitly watches only `src` and `server.js` while explicitly ignoring `../../apps/user-web/.next`, `logs`, and `coverage`. 

## 6. Optional Service Lifecycle (Phase 13 & 14)
- **Audit:** Verified that both BullMQ/Redis (`queue.service.js`) and Meilisearch (`search.service.js`) initialize gracefully.
- **Result:** Both services wrap their initializations in `try/catch` blocks and degrade safely if the external service is unavailable. The application will not fatally crash (`uncaughtException`) if Redis or Meilisearch are offline during startup.

## 7. Next Steps for the User
- **OneDrive Conflict:** The persistent Next.js build errors (`500 sw.js`, missing `routes-manifest.json`) are heavily correlated with Microsoft OneDrive locking the files while trying to sync them during active development. Moving the repository to `C:\dev\Pitchin180` (or another non-synced directory) is strongly recommended for local frontend stability.
