# UI Architecture Rules

**Status:** Enforced
**Applies to:** All frontend applications (`apps/*`) and shared packages (`packages/ui`).

## 1. Component Reusability (Strict)
- **NEVER** hardcode atomic components like Buttons, Inputs, Cards, or Modals directly inside page files (`page.tsx`, `layout.tsx`).
- Always import these components from the shared `@workspace/ui` package.
- If a required variant of a component does not exist in `@workspace/ui`, you must UPDATE the shared component to support the variant rather than hardcoding Tailwind classes locally in the page.

## 2. Headless UI & Shadcn Methodology
- Our component architecture follows industry best practices (Shadcn UI style).
- We use `class-variance-authority` (cva) for defining component variants (e.g., `primary`, `secondary`, `outline`).
- We use Radix UI primitives for complex accessible components (Dropdowns, Dialogs, Selects).

## 3. Atomic Design Principles
- **Atoms:** (Buttons, Inputs, Badges) live in `packages/ui/src/components`.
- **Molecules:** (Cards, Form Fields) live in `packages/ui/src/components`.
- **Organisms:** (Navbars, Footers, Complex Tables) can live in `@workspace/ui` if shared across apps, or in the app's `components/` folder if app-specific.
- **Templates/Pages:** `page.tsx` should ONLY compose organisms and molecules. `page.tsx` should have minimal Tailwind classes, mostly for layout grids and flexboxes.

## 4. Styling Approach
- Use Tailwind CSS exclusively. No inline styles (`style={{...}}`) unless dynamically calculating values that Tailwind cannot handle.

