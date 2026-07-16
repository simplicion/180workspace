---
sidebar_position: 1
---

# Good Practices & Security

To maintain a high standard of code quality and protect user data, all contributions to the 180workspace Platform must adhere to the following security and coding practices.

## 1. API Security (Backend)
- **Rate Limiting:** The `express-rate-limit` package is implemented globally (`globalLimiter`) and strictly on authentication routes (`authLimiter`) to prevent brute-force attacks.
- **Helmet:** We use `helmet` to automatically set secure HTTP headers (e.g., preventing clickjacking).
- **NoSQL Injection Prevention:** `express-mongo-sanitize` is active to strip out keys containing `$` or `.` from `req.body`, `req.query`, and `req.params`.
- **JWT Security:** Tokens should never be logged. Ensure `JWT_SECRET` is rotated periodically in production environments.

## 2. Observability & Error Tracking
- **Sentry:** We use `@sentry/node` and `@sentry/profiling-node` for error tracking. Ensure you capture exceptions using `Sentry.captureException(err)` within catch blocks if they are not passed to the global error handler.
- **Logging:** We use `morgan` for HTTP request logging. Do not log sensitive user data (passwords, tokens, PII).

## 3. Coding Standards (Monorepo)
- **Linting:** We have centralized ESLint configurations (`packages/eslint-config`). Run `pnpm lint` before pushing any code.
- **TypeScript:** We strongly type all frontend code and shared packages. Use Zod for runtime schema validation, especially for API requests.
- **DRY (Don't Repeat Yourself):** If you find yourself duplicating UI elements in `admin-web` and `user-web`, extract the component to the `@workspace/ui` package.

## 4. Frontend Performance
- **Image Optimization:** Always use the Next.js `<Image />` component rather than standard `<img>` tags.
- **Caching:** Leverage RTK Query's built-in caching for API requests. Do not manually implement `useEffect` data fetching unless absolutely necessary.
- **Lazy Loading:** For heavy components (e.g., charts or rich text editors), use Next.js dynamic imports (`next/dynamic`) to reduce the initial JavaScript payload.
