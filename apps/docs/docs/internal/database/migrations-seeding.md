---
sidebar_position: 2
---

# Migrations & Seeding

Managing database state is critical in a complex application. We provide scripts in `@workspace/db` to handle initial data and structural changes.

## Seeding the Database

When setting up the project locally for the first time, you need initial data (like roles, permissions, and a superadmin account).

### Running the Seed Script
Navigate to the backend directory and run the seed command:
```bash
cd apps/http-backend
pnpm run seed
```
This executes `seed.js` which:
1. Clears existing roles (if in development).
2. Inserts the default RBAC roles (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `USER`).
3. Creates a default superadmin user so you can log into `admin-web`.

## Migrations

As the schema evolves (e.g., adding a new required field to existing documents), we must run data migrations.

### Creating a Migration
Migrations are typically small, one-off scripts stored in the `migrations/` folder of the backend.
- They connect to PostgreSQL.
- Iterate over documents in batches using `.cursor()`.
- Apply the data transformation.
- Save the documents.

*Note: Always test migration scripts on a staging database replica before running them in production to avoid data corruption.*
