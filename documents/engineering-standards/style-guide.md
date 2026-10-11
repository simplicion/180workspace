---
sidebar_position: 4
---

# Style Guide & Coding Standards

To maintain a clean and legible codebase across the entire monorepo, we enforce strict styling rules.

## ESLint and Prettier

We use a centralized ESLint configuration located at `packages/eslint-config`.

- **Auto-formatting:** Prettier is integrated with ESLint. Always run `pnpm format` before committing.
- **Rules enforced:**
  - No unused variables (`no-unused-vars`).
  - Strict React hooks dependencies (`react-hooks/exhaustive-deps`).
  - Consistent import sorting.

## TypeScript Strictness

The platform relies on TypeScript to catch errors at compile-time rather than runtime. Our base `tsconfig.json` enforces:
- `strict: true` (which implies `noImplicitAny`, `strictNullChecks`, etc.).
- Avoid using `any`. Use `unknown` if you must bypass type checks temporarily, but prefer creating proper Zod schemas in `@workspace/common`.

## Naming Conventions
- **Files/Folders:** `kebab-case` (e.g., `user-profile.component.tsx`).
- **Variables/Functions:** `camelCase` (e.g., `fetchUserData()`).
- **Classes/Components/Models:** `PascalCase` (e.g., `UserProfile`, `ProjectModel`).
- **Constants/Enums:** `UPPER_SNAKE_CASE` (e.g., `MAX_RETRY_COUNT`).
