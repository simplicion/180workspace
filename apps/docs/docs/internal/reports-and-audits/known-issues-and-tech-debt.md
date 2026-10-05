# Known Issues and Tech Debt

## Code Smells
- **Raw Image Usage in React:** Widespread HTML `<img>` elements actively degrade app speed tests instead of using Next's native `<Image />` rendering layer which enforces WebP streaming algorithms.
- **Dangerous Closure Overrides:** ESLint actively flags dozens of generic React `useEffect` loops operating missing dependency conditions. This creates subtle, practically un-testable race conditions where UI strings hold completely out of sync states from the active server payload. (e.g. `Warning: React Hook useEffect has a missing dependency: 'fetchDetails'`).

## Architectural Flaws
- **Memory Driven Compilation Scaling:** The `package.json` relies on a structural brute force wrapper (`cross-env NODE_OPTIONS=--max-old-space-size=4096 next build`) to compile the frontend application. 
    - This is a symptom, not a solution. It indicates massive structural Tree-Shaking failures blocking Next from purging duplicate unused modules natively across the massive application base.
- **Loose API Mounting Interfaces:** Some modules have shown instances of isolated disconnects. (e.g. previously fixing the Activity route not bound implicitly via the main node pipeline.) Manual route linkage invites missing endpoints across heavy codebase upgrades.

## Risk Areas
*   **Company Separation via API vs UI:** The frontend's reliance on hiding visual UI segments instead of robustly verifying payload returns opens theoretical edge cases if users artificially construct valid POST strings guessing endpoint geometries outside standard forms. 
*   **Database Schema Inflation:** 40+ Prisma models inside a single backend structure risk monolithic structural bloat. Deep inter-model dependencies via `companyId` make schema breaking changes extremely dangerous to deploy live without robust migration logic layers.
