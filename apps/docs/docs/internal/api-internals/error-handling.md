---
sidebar_position: 5
---

# Centralized Error Handling

Proper error handling prevents sensitive data leaks and provides actionable logs for debugging.

## Backend Error Handling

All Express controllers must use the `catchAsync` wrapper (or `try/catch` blocks that call `next(error)`) to push errors to the central handler.

### `errorHandler.js` Middleware
Located in `src/middleware/error.js`, this function sits at the end of the Express pipeline.
1. **Validation Errors:** Extracts Zod/Prisma validation errors and returns a `400 Bad Request` with structured details.
2. **Operational Errors:** Known errors (e.g., "User not found") return the appropriate HTTP status code (e.g., `404`).
3. **Programming/Unknown Errors:** Catches unhandled exceptions, returns a generic `500 Internal Server Error`, and ensures the stack trace is NEVER sent to the client in production.

## Sentry Integration

For observability, we capture unhandled exceptions using `@sentry/node` (backend) and `@sentry/nextjs` (frontend).

- **Backend:** `Sentry.captureException(err)` is triggered automatically in the error middleware for 500-level errors.
- **Frontend:** Global error boundaries catch React rendering crashes and send them to Sentry.

*Always ensure the `SENTRY_DSN` is properly set in `.env` for production.*
