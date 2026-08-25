> *Last verified against Postgres schema migration (July 2026)*

# API Documentation

## Overview
The backend interface serves a strictly RESTful HTTP API. 
All endpoints are namespaced underneath `/api` (as indicated by `app.use('/api', require('./src/routes/index.routes'))` in `server.js`).

## Request / Response Formats
- **Headers Required:** `Authorization: Bearer <TOKEN>`
- **Content-Type:** `application/json` (unless handling document uploads using `multipart/form-data`)
- **Return Type:** Structured JSON.
    - *Success:* `{ "status": "success", "data": { ... } }`
    - *Failure:* `{ "error": "Descriptive message" }`

## Common Module Endpoints (CRUD Syntax)

### 1. Projects API (`/api/projects`)
- **GET `/api/projects`** - Fetches paginated active projects. Supports `status` and `priority` query filters.
- **POST `/api/projects`** - Creates a strict validated Project Schema.
- **PUT `/api/projects/:id`** - Patches project metadata.
- **DELETE `/api/projects/:id`** - Invokes mathematical soft deletion (`deletedAt` injection).

### 2. CRM & Users (`/api/users`, `/api/clients`)
- **GET `/api/users/directory`** - Lists cross-department employee graphs.
- **POST `/api/sales/deals`** - Registers sales lifecycle elements.

### 3. Financial Endpoints (`/api/finance`)
- **POST `/api/invoices/generate`** - Connects to internal PDF templating to compile dynamic invoice documents.
- **GET `/api/expenses/ledger`** - Math calculation endpoint for specific month/quarter aggregations.

### 4. Global Activity Pipeline (`/api/activity`)
- **GET `/api/activity`** - Protected event-stream retrieving backend logs for system auditing and compliance.

## Authentication Methods
All protected endpoints utilize a chained Node middleware structure:
`router.get('/', protect, moduleGuard('hr'), myControllerFunction)`
- `protect`: Automatically verifies the JWT signature and blocks manipulation.
- `moduleGuard`: Enforces fine-grained logic asserting the user's decoded rank explicitly permits interacting with the targeted functional area.

## Error Handling Patterns
The API does not fail silently. If a 400 Bad Request or 500 Internal Server error occurs, a distinct `errorHandler` block catches it and maps it securely to avoid leaking Server Stacktraces into the network tab. All errors are channeled to Sentry for DevOps analysis.
