# Error Handling and Logging

## Overview
Error execution across the 180workspace structure isolates network faults completely from database faults ensuring stable user degradation. Backend crashes are caught before stalling the root process.

## Error Handling Strategy
1. **Frontend Fallbacks:** Next.js provides intrinsic `error.tsx` and `not-found.tsx` boundaries ensuring component trees do not crash fully upon bad data receives. 
2. **Global Backend Net:** Instead of returning raw Node stack traces on `500 Internal`, the Express application relies on exactly one centralized file (`src/middleware/error.js`). 
3. **Graceful Terminations:** Raw server-breaking logic (`unhandledRejection`, `uncaughtException`) are bound actively in `server.js` to log critical events without silently blocking traffic.

## Logging Mechanisms
- **Sentry Integration:** Comprehensive application insights are mapped via `@sentry/node` and `@sentry/profiling-node`. Sentry request handlers sit specifically ahead of all route loading to monitor incoming stress, and error catchers reside at the very bottom.
- **Morgan Analytics:** Based on the execution environment block (`process.env.NODE_ENV`), backend terminal streams map readable I/O requests natively allowing instant debug traces for Docker outputs.
- **Activity Hub / Audit DB:** Internal user telemetry logic pushes explicit API requests that construct or destroy objects into the immutable `AutomationLog.js` and `AuditLog.js` PostgreSQL schemas.

## Failure Scenarios
*   *Database Disconnect:* Express error nets catch connection failures, pushing a `503 Service Unavailable`.
*   *Invalid Company Signature:* The `company-db` middleware will completely reject the API connection explicitly stating `401 Unauthorized` if no associated workspace namespace exists.
*   *Front-End Component Error:* Isolated via React Error boundaries preventing full white screens of death affecting other rendered layout charts.
