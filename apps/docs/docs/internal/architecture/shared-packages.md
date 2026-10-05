---
sidebar_position: 4
---

# Shared Packages (`@workspace/*`)

The monorepo leverages Turborepo to share code between the different applications. This guarantees consistency and reduces code duplication.

## 1. `@workspace/ui`
This package contains our shared React component library, built with Tailwind CSS and Radix UI (or Shadcn).
- **Contents:** Buttons, Modals, Forms, Data Tables, and Typography.
- **Usage:** Both `user-web` and `admin-web` import components from here. If a design system update is needed, it is made here and propagates to all frontends.

## 2. `@workspace/common`
This package houses shared utilities, types, and validation schemas.
- **Zod Schemas:** API request validation schemas are defined here. The backend uses them to validate incoming data, and the frontend uses the exact same schemas to validate forms before submission.
- **Types:** TypeScript interfaces for API responses.

## 3. `@workspace/db`
Contains the shared database logic, Prisma configurations, and seed scripts.
- **Connection Logic:** Centralized PostgreSQL connection handling.
- **Seeders:** Scripts to populate the database with initial superadmins, roles, and dummy data for development.

## 4. `eslint-config` & `typescript-config`
These are configuration packages.
- Instead of maintaining separate `.eslintrc` and `tsconfig.json` files in every app, the apps extend these central configurations to enforce uniform code quality.
