# Design System

**Status:** Enforced
**Applies to:** All frontend applications (`apps/*`).

## 1. Aesthetic Identity (SaaS Pro Max)
- **Glassmorphism:** We heavily utilize frosted glass effects. The standard class for a glass panel is `backdrop-blur-md bg-white/60 dark:bg-black/60 border border-white/20 dark:border-white/10`.
- **Dark Mode:** We use standard Tailwind `.dark` classes for dark mode support. Every hardcoded color MUST have a dark mode equivalent (e.g., `text-gray-900 dark:text-gray-100`).

## 2. Typography
- **Headings:** Always use tracking-tight and font-bold for primary headings (e.g., `text-4xl md:text-6xl font-bold tracking-tight`).
- **Body Text:** Use `text-gray-600 dark:text-gray-400` for body text to ensure sufficient contrast without being overly harsh.

## 3. Shadows & Elevation
- **Light Mode Shadows:** `shadow-lg shadow-black/5`
- **Dark Mode Shadows:** `dark:shadow-[0_0_40px_rgba(255,255,255,0.05)]`
- Avoid arbitrary, messy shadow values like `shadow-[0_30px_100px_-20px_rgba(0,0,0,0.1)]`. Stick to the Tailwind defaults or the strict rules defined in `globals.css`.

## 4. Spacing & Grids
- Use CSS Grid (`grid grid-cols-1 md:grid-cols-3 gap-8`) for feature cards and layouts rather than complex Flexbox wrapping when aligning items in rows/columns.
- Maintain consistent padding inside cards: usually `p-6` or `p-8`.

