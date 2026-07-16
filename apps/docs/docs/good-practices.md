---
sidebar_position: 7
---

# Good Practices & Code Patterns

This document outlines the coding standards and specific code-level patterns to use when contributing to the 180workspace Platform.

## 1. Clean Code Principles
- **DRY (Don't Repeat Yourself):** Extract reusable logic into utility functions or shared hooks.
- **Single Responsibility Principle:** Functions and components should do one thing and do it well.
- **Meaningful Naming:** Use descriptive variables (`isUserLoggedIn` instead of `authStatus`).

## 2. API Design Patterns
- **Standardized Responses:** All APIs should return `{ success: boolean, data?: any, error?: string }`.
- **Pagination:** Use limit/offset or cursor-based pagination for lists.

## 3. Frontend Component Patterns
- **Props Interfaces:** Always define strict TypeScript interfaces for component props.
- **Separation of Concerns:** Keep API fetching logic out of UI components. Use the Service layer.

## 4. Error Handling
- Use the centralized error handler in Express.
- Never swallow errors with empty `catch` blocks. Always log to Sentry in production.
