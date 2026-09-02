# 180 Workspace Universal Resizable AI Drawer Implementation

## 1. Overview & Architecture

We have consolidated the fragmented AI drawers across the platform into a single, unified, high-performance **`UniversalAIDrawer`** component exported directly from [`@workspace/ui`](file:///c:/Users/saavi/OneDrive/Desktop/180workspace/packages/ui/src/index.ts).

### Key Features of the Universal AI Drawer:
1. **Docked Top-to-Bottom Right Panel**:
   - Fixed from top to bottom (`fixed top-0 bottom-0 right-0 h-screen z-50 flex flex-col`), seamlessly docking into the right side of the workspace without covering the center canvas or floating irregularly.
   - Non-blocking layout allowing live interaction with forms, landing pages, and documents while the AI is active.
2. **Resizable Breadth / Width (Drag & 1-Click Presets)**:
   - **Interactive Left Edge Drag Handle**: Smoothly drag left/right to adjust breadth between `360px` (min) and `960px` (max).
   - **1-Click Size Presets**:
     - `S` (Compact: `380px`) — Perfect for smaller laptop viewports.
     - `M` (Standard: `500px`) — Balanced default for chatting & quick modifications.
     - `L` (Wide: `720px`) — High-visibility mode for multi-column schemas, complex pricing grids, and section previews.
   - **Local Storage Persistence**: Automatically remembers the user's preferred width across sessions via `localStorage.getItem('180_ai_drawer_width')`.
3. **Multi-Mode Context Switching**:
   - `mode="form"`: Form Builder mode (dynamic questions, multi-step pages, theme colors, 5-star ratings, resume uploads, and CRM leads synchronization).
   - `mode="website"`: Website Builder mode (landing pages, section insertions, customer testimonials, pricing matrices, and brand tokens).
   - `mode="document"`: Document Architect mode (contracts, proposals, milestones, payment checkouts, and legal signatures).
   - `mode="general"`: Universal Copilot mode.
4. **Conversational Intelligence**:
   - Detects chitchat and greetings (`"hi"`, `"hello"`, `"help"`, `"what can you do"`) and returns warm, intelligent guidance with live awareness of the entity name and section/question count.
   - Sends live AST states to Google Gemini / OpenAI for real-time synthesis and live canvas updates.

---

## 2. Integrated Components

- [`packages/ui/src/components/UniversalAIDrawer.tsx`](file:///c:/Users/saavi/OneDrive/Desktop/180workspace/packages/ui/src/components/UniversalAIDrawer.tsx): Core component.
- [`packages/ui/src/index.ts`](file:///c:/Users/saavi/OneDrive/Desktop/180workspace/packages/ui/src/index.ts): Exported from `@workspace/ui`.
- [`apps/frontend/app/(platform)/(advertising-app)/forms/[id]/_components/AIFormDrawer.tsx`](file:///c:/Users/saavi/OneDrive/Desktop/180workspace/apps/frontend/app/(platform)/(advertising-app)/forms/[id]/_components/AIFormDrawer.tsx): Form Builder integration.
- [`apps/frontend/app/(platform)/(advertising-app)/advertising/[id]/edit/_components/AIWebsiteDrawer.tsx`](file:///c:/Users/saavi/OneDrive/Desktop/180workspace/apps/frontend/app/(platform)/(advertising-app)/advertising/[id]/edit/_components/AIWebsiteDrawer.tsx): Website Builder integration.
- [`apps/frontend/app/(platform)/(workspace-tools-app)/document-editor/_components/AIDocumentDrawer.tsx`](file:///c:/Users/saavi/OneDrive/Desktop/180workspace/apps/frontend/app/(platform)/(workspace-tools-app)/document-editor/_components/AIDocumentDrawer.tsx): Document Editor integration with resizable width handle and preset controls.

---

## 3. Real-Time Form Leads & Inactive Projects Query Engine

We added dedicated built-in deterministic tools and enhanced LLM tool-calling error recovery:

1. **`get_form_submissions` Tool**:
   - Deterministically queries database submissions, responses, and values for any form title or slug.
   - Formats results with lead names, contact info, timestamps, and direct links to 180 Forms analytics.
   - Provides clear fallbacks when a requested form (e.g., `"Thor power"`) is not found, showing all active forms and their lead counts.
2. **`get_project_health` Tool**:
   - Queries active, inactive (`planning`, `not_started`, `completed`), and delayed projects with live database counts.
3. **Resilient JSON Tool Parser**:
   - Seamlessly handles nested tool JSON and prevents raw code blocks or `undefined` action messages in the chat UI.
