---
sidebar_position: 3
---

# Design Patterns & Code Patterns

To ensure consistency across the monorepo, we adhere to recognized software design patterns.

## Backend Patterns (Express / Node.js)

### 1. Singleton Pattern
Used for database connections and Redis clients. We ensure that only one instance of the PostgreSQL connection pool exists and is shared across the application, preventing connection exhaustion.

### 2. Factory Pattern
Used in the AI generation services. A factory function determines which LLM provider (Groq, OpenAI, Gemini) to instantiate based on the requested task priority or cost constraints.

### 3. Middleware Pattern
Express inherently relies on this. We use it extensively for cross-cutting concerns:
- **Authentication:** Validating JWTs before reaching controllers.
- **Rate Limiting:** Applying limits based on IP.
- **Tenant Context:** Injecting the `companyId` into requests (`tenant-db.js`).

## Frontend Patterns (React / Next.js)

### 1. Custom Hooks
Business logic specific to components is extracted into custom hooks (e.g., `useProjectsData()`). This keeps the UI components clean and makes the logic reusable.

### 2. Context API & Redux Toolkit
- **Context API:** Used for lightweight, UI-specific global state (like Theme toggling or Sidebar open/closed state).
- **Redux Toolkit:** Used for complex, data-heavy global state and API caching (RTK Query).

### 3. Higher-Order Components (HOCs)
Used for route protection. An HOC like `withAuth` wraps page components, checking for user sessions and redirecting to the login screen if unauthorized.
