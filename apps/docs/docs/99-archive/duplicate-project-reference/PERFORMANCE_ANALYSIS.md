> *Last verified against Postgres schema migration (July 2026)*

# Performance Analysis

## Overview
The architecture handles high data loads gracefully via Pagination constraints and Edge caching. However, static analysis exposes optimization potentials, specifically related to physical frontend DOM weight and deep relational queries.

## Bottlenecks & Inefficient Patterns

### 1. Excessive DOM Rendering (Next.js `<img>` vs `<Image>`)
- The Next.js compiler highlights significant over-reliance on heavy `<img>` HTML components across tables (`app/dashboard/employees`, `app/dashboard/projects`).
- **Impact:** Skipping the native `next/image` tag forces raw resolution downloads, massively spiking bandwidth limits and tanking First Contentful Paint (FCP). 

### 2. React Hook Instability
- Advanced static analysis flags widespread missing dependencies across `useEffect` loops (`fetchData`, `startPolling`, etc.)
- **Impact:** Omitting specific listener triggers either forces stale data UI returns or unexpected infinite re-render loops.

### 3. Server Architecture Memory Ceiling
- Current `package.json` routines rely directly on forcing cross-environmental max heap boosts (`cross-env NODE_OPTIONS=--max-old-space-size=4096`).
- **Impact:** The Vercel execution context struggles with the vast quantity of UI components forcing high-tier memory allocations just to compile successfully.

## Optimization Opportunities
*   **Lazy Loading Dialogs:** Migrating massive interface modals behind Next.js dynamic imports ensuring they only load JavaScript payloads upon interaction.
*   **Image Compression APIs:** Enact a hard rule restricting raw avatar and project thumbnail `img` usages to strict native optimization.
*   **Database Query Optimization:** Ensuring that heavy dashboard aggregations operate cleanly off Prisma indexes (`@@index([companyId, status])`) stopping massive table scans. We must also optimize deep `include` queries in Prisma to avoid massive JOIN payloads that spike Node.js memory. 
*   **Socket.IO Debouncing:** Current chat operations pushing data dynamically over web sockets need aggressive backend debouncing assuring 50 rapid chat posts do not map to 50 raw DB transactions.
