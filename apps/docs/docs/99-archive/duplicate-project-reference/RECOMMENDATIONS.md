> *Last verified against Postgres schema migration (July 2026)*

# Recommendations

## 🔴 CRITICAL

- **Resolve Exhaustive Hooks Race Conditions**
  - *Risk:* Components across all critical paths suffer from missing `useEffect` dependencies.
  - *Action:* Systematically enforce strict React linting paths. Wrap fetched data arrays in `useCallbacks`.
- **Remedy Root Compilation Bloat**
  - *Risk:* Heavy reliance on expanded Node memory sizes (`--max-old-space-size=4096`) to process Webpack logic risks deploying massive JS bundles to clients. 
  - *Action:* Perform a profound library audit analyzing the usage of massive generic libraries.
- **Audit Prisma Query Performance**
  - *Risk:* With 85 models and deep relational joins, unbounded `include` clauses in Prisma risk severe memory bloat and N+1 query execution.
  - *Action:* Enforce pagination (limit/offset via `take`/`skip`) on all list endpoints and replace full relational includes with targeted `select` statements where possible.

## 🟠 IMPORTANT

- **Replace Raw Output Imagery**
  - *Risk:* Next.js compiler is heavily bottlenecking Vercel deployment logs complaining about `<img src="...">`.
  - *Action:* Completely sweep and replace basic image usage with `next/image` optimizing loading pipelines to LCP-grade standards natively.
- **Consolidate Custom Smoke Testing Into Suites**
  - *Risk:* Isolated root scripts risk decay without standardized runners analyzing their success rate continuously.
  - *Action:* Integrate a structured testing package (Jest) organizing these scripts mathematically ensuring coverage metrics surface correctly.

## 🟢 IMPROVEMENTS

- **Microservice Splitting (Long Term)**
  - *Enhancement:* As the PostgreSQL database scales beyond the existing 85 models, extract distinct operational workloads (e.g., HR Payroll and CRM pipelines) into smaller, separated Docker containers reducing monolithic compilation danger loops.
- **Implement Centralized E2E Framework**
  - *Enhancement:* Adopt Cypress or Playwright automating synthetic tests testing the tenant authorization boundaries explicitly.
