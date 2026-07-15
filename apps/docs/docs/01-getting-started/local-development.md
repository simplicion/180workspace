---
sidebar_position: 1
---

# Local Development Guide

This guide will walk you through setting up the IMS Platform monorepo on your local machine.

## Prerequisites
Ensure you have the following installed before proceeding:
- **Node.js**: Version 20 or higher.
- **pnpm**: We use pnpm for managing the monorepo workspace (`npm install -g pnpm`).
- **Turbo**: Turborepo CLI (`npm install -g turbo`).
- **PostgreSQL**: A local PostgreSQL instance or a PostgreSQL Atlas URI.

## 1. Clone & Install
```bash
git clone <repository-url>
cd IMS-SYSTEM
pnpm install
```

## 2. Environment Variables
You need to set up `.env` files for the frontend apps and the backend.
Reference the **Environment Variables Reference** document for the complete list of required keys.

Copy the example files:
```bash
cp apps/http-backend/.env.example apps/http-backend/.env
cp apps/user-web/.env.example apps/user-web/.env.local
cp apps/admin-web/.env.example apps/admin-web/.env.local
```

## 3. Running the Stack
You can run the entire monorepo with a single command from the root directory:

```bash
pnpm dev
```

This uses Turborepo to concurrently start:
- `http-backend` (usually on port 5000)
- `user-web` (usually on port 3001)
- `admin-web` (usually on port 3000)
- `docs` (Docusaurus on port 3002)

## 4. Seeding the Database
For a fresh environment, you may want to seed the database with initial superadmin users and roles:
```bash
cd apps/http-backend
pnpm run seed
```

## 5. Troubleshooting Port Conflicts
If you encounter a port in use error, you can kill the process using the port (e.g., for port 3000):
```bash
npx kill-port 3000
```
