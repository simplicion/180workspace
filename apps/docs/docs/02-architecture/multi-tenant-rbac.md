---
sidebar_position: 3
---

# Multi-Tenancy & RBAC

The IMS platform is a multi-tenant B2B application with strict Role-Based Access Control (RBAC).

## Multi-Tenant Architecture

Every company that signs up for the IMS dashboard receives an isolated workspace. This is achieved via logical isolation in a shared database.

### `tenant-db.js` Middleware
Located in the backend, this middleware is the core of our data isolation.
1. When a user logs in, their JWT payload contains their `userId` and `companyId`.
2. For any protected route, the `tenant-db.js` middleware extracts the `companyId`.
3. It attaches this context to the request (e.g., `req.tenantCompanyId`).
4. Repositories and Services MUST use this `companyId` when querying the database (e.g., `Project.find({ companyId: req.tenantCompanyId })`).

*Failure to include the `companyId` in queries could result in data leaking across companies.*

## Role-Based Access Control (RBAC)

The system enforces a hierarchical permission model to control what users can see and do within their company workspace.

### Core Roles
1. **System / Super Admin:** Platform owners. Can access `admin-web` to manage pricing plans, suspend tenants, and view global health metrics.
2. **Company Admin / Founder:** The creator of the company workspace. Has full access to billing, settings, and team management.
3. **Manager:** Can create projects, assign tasks, and view reports, but cannot access billing or critical company settings.
4. **User / Employee:** Can only view projects they are assigned to, log time, and update their own tasks.

### Implementing RBAC
Routes are protected using role-checking middleware.
```javascript
// Example usage in an Express route
router.post('/projects', requireAuth, requireRole(['ADMIN', 'MANAGER']), projectController.createProject);
```
