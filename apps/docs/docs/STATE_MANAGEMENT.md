# State Management

## Overview
The 180workspace Frontend uses a highly reactive architectural blend to manage state without introducing massive external boilerplate overheads like Redux. The system leverages Next.js native capabilities optimized by modern React 19 paradigms.

## How State is Managed
1. **Server vs. Client Contexts:** As an App Router-based implementation (`app/`), the application prioritizes Server Components for massive computational datasets avoiding immediate Client Hydration. Interactive areas are distinctly wrapped in `'use client'` boundaries.
2. **Component-Level Hooks:** Core data is handled locally. Forms, modals, and dynamic filters rely on granular `useState`, `useReducer`, or Context API definitions. 
3. **Data Fetching Integrity:** The `useEffect` hook extensively orchestrates lifecycle bindings parsing `axios` fetches towards the backend. (Recent Vercel compile analytics exposed some dependencies failing exhaustive-deps warnings, indicating tightly-bound closures tracking live updates).
4. **URL & SearchParams:** URL routing operates as the defacto 'state director.' Sorting filters and deep links use Next.js `useRouter` to push historical state, allowing safe sharing of specific page structures.

## Data Flow Patterns
*   **Unidirectional Flow:** Props drill downwards strictly from parent layout grids into presentation UI tables or modular rows (e.g., `<ProjectCard>` receiving `project={item}`).
*   **Event Emitters (WebSockets):** `socket.io-client` intercepts active multi-user state mutators. If an entity updates a calendar event or sends a chat ping, the local state array receives real-time payload appending without forcing total window refreshes.
*   **Memoization Guards:** Complex computation maps (like large lists of transactions or complex layout filters) are contained within `useMemo` hooks, assuring layout shifts do not re-calculate memory-intensive DOM loops improperly.

## Global vs Local State Usage
- **Local State** dominates individual form management. Temporary strings, passwords, and file blobs live natively within the modal component hierarchy until finalized.
- **Global State** represents the current deeply-nested User configurations (Role assignments, Theme values, Navigation preferences). These globally shared states bypass deep layout prop-drilling by leveraging higher-order wrappers.
