# Authentication and Security

## Overview
Authentication acts as the primary gatekeeper for the 180workspace system. Validation occurs at multiple points over the network request timeline, providing defense-in-depth architecture.

## Authentication Flow
1. **Frontend Initiation:** User supplies email and password strings to `/login` or through a dedicated OAuth modal constraint (`@react-oauth/google`).
2. **Backend Handshake:** The controller cross-references the hashed password using `bcryptjs` and asserts validity.
3. **Token Issuance:** A cryptographically signed **JSON Web Token (JWT)** is generated holding the User's ID, Company Company designation, and active access level.
4. **Local Continuity:** The frontend application stores the received bearer token inside local cache/cookies to hydrate subsequent server requests via an Axios interceptor block.

## Authorization Logic
Authorization is completely abstracted from the Client UI logic to prevent endpoint circumvention.
The `company-db` middleware intercepts requests, extracts the JWT, and limits absolutely all Prisma database calls (Queries, Updates, Deletions) strictly to records mapping to `req.user.companyId`.

## Role-Based Access Control (RBAC)
User tiers determine lateral access permissions across distinct micro-applications within the Monolith.
- **Admin:** Absolute global override permissions across CRM, Projects, Finance, and configuration structures.
- **Manager:** Authorized strictly for operational tasks (Viewing global task logs, assigning roles, moving pipelines).
- **HR/Finance:** Highly compartmentalized views specific to salary generation or attendance approval.
- **Employee/Client:** Least-privileged entities capable only of seeing endpoints explicitly related or assigned to them.

## Identified Security Infrastructure
- **Dependency Guardrails:** `helmet` locks down rogue cross-domain access headers, mitigating XSS and clickjacking.
- **DDoS/Brute Force Mitigation:** `express-rate-limit` enforces a strictly localized barrier specifically tuned tighter on `/login` and `/auth` endpoints restricting excessive hits.
- **Database Injection Safeguards:** `express-mongo-sanitize` scrubs all incoming payload inputs to remove hidden Prisma operator execution attempts (`$eq`, `$gt`).
- **Secret Management:** Hard fail conditions ensure backend boot processes crash automatically if `JWT_SECRET` is missing in production environments (`server.js`).
