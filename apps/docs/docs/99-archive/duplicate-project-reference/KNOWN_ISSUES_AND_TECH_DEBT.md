> *Last verified against Postgres schema migration (July 2026)*

# Known Issues and Tech Debt

## Code Smells
- **Raw Image Usage in React:** Widespread HTML `<img>` elements actively degrade app speed tests instead of using Next's native `<Image />` rendering layer which enforces WebP streaming algorithms.
- **Dangerous Closure Overrides:** ESLint actively flags dozens of generic React `useEffect` loops operating missing dependency conditions. This creates subtle, practically un-testable race conditions.

## Architectural Flaws
- **Memory Driven Compilation Scaling:** The `package.json` relies on a structural brute force wrapper (`cross-env NODE_OPTIONS=--max-old-space-size=4096 next build`) to compile the frontend application. 
    - This is a symptom, not a solution. It indicates massive structural Tree-Shaking failures.
- **Loose API Mounting Interfaces:** Some modules have shown instances of isolated disconnects.

## Risk Areas
*   **Company Separation via API vs UI:** The frontend's reliance on hiding visual UI segments instead of robustly verifying payload returns opens theoretical edge cases. 
*   **Database Schema Inflation & N+1 Queries:** 85 Prisma models inside a single backend structure risk monolithic structural bloat. Deep inter-model dependencies via `companyId` make schema breaking changes dangerous. Additionally, heavy use of Prisma `include` without pagination poses significant N+1 query and memory bloat risks when loading deep relations (e.g., loading a Project with all Tasks, Invoices, and Milestones simultaneously).
