---
sidebar_position: 6
---

# Performance & Caching

At the scale of the IMS Platform, efficiency is crucial. Follow these performance strategies.

## Backend Performance

### 1. Redis Caching
For endpoints that receive heavy traffic but rarely change (e.g., global settings, master lists), implement caching using Redis.
- Check Redis for the key. If found, return it immediately.
- If not found, query PostgreSQL, store the result in Redis with a TTL (Time To Live), and return it.

### 2. Database Pagination
Never return unbounded lists from the database.
- Use `limit` and `skip` (or cursor-based pagination) for lists of tasks, projects, or users.
- Always include indexes on queried fields (e.g., `companyId` and `createdAt`).

## Frontend Performance

### 1. Asset Optimization
- Use Next.js `<Image />` for automatic WebP conversion and responsive sizing.
- Host large videos or documents on Cloudinary/S3, never in the public folder.

### 2. RTK Query Caching
Redux Toolkit Query automatically caches API responses.
- Define `providesTags` and `invalidatesTags` in your endpoint definitions so the frontend only refetches data when a relevant mutation occurs (e.g., refetching the "Projects List" only after a "Create Project" mutation completes).

### 3. Dynamic Imports
Delay the loading of heavy third-party libraries (like Chart.js or rich-text editors) until they are actually rendered using `next/dynamic`.
