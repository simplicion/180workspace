# 180workspace Marketing Design System & Tokens

**Applies to:** `apps/marketing-web`

---

## 1. Color Harmony & App Domain Accents

Each 180workspace application is assigned a distinctive, harmonious accent color token:

| App Category | Primary Color | Background Tint | Badge Styling |
| :--- | :--- | :--- | :--- |
| **CRM & Sales** | Indigo / Blue (`#4f46e5`) | `bg-indigo-50/50 dark:bg-indigo-950/30` | `bg-indigo-100 text-indigo-700` |
| **Traffic Director** | Crimson / Rose (`#e11d48`) | `bg-rose-50/50 dark:bg-rose-950/30` | `bg-rose-100 text-rose-700` |
| **Finance & Accounting** | Emerald / Teal (`#059669`) | `bg-emerald-50/50 dark:bg-emerald-950/30` | `bg-emerald-100 text-emerald-700` |
| **Projects & Tasks** | Amber / Orange (`#d97706`) | `bg-amber-50/50 dark:bg-amber-950/30` | `bg-amber-100 text-amber-700` |
| **HR Management** | Cyan / Sky (`#0284c7`) | `bg-sky-50/50 dark:bg-sky-950/30` | `bg-sky-100 text-sky-700` |
| **Communications** | Violet / Purple (`#7c3aed`) | `bg-violet-50/50 dark:bg-violet-950/30` | `bg-violet-100 text-violet-700` |
| **Social Media** | Pink / Fuchsia (`#db2777`) | `bg-pink-50/50 dark:bg-pink-950/30` | `bg-pink-100 text-pink-700` |
| **Workspace Tools** | Blue / Cyan (`#2563eb`) | `bg-blue-50/50 dark:bg-blue-950/30` | `bg-blue-100 text-blue-700` |
| **Insights & Analytics** | Teal / Mint (`#0d9488`) | `bg-teal-50/50 dark:bg-teal-950/30` | `bg-teal-100 text-teal-700` |
| **Orbit Copilot (AI)** | Gradient Violet-Indigo | `bg-gradient-to-r from-violet-50 to-indigo-50` | `bg-gradient-to-r from-violet-600 to-indigo-600 text-white` |
| **Company Hub & Admin** | Slate / Zinc (`#475569`) | `bg-slate-50/50 dark:bg-slate-900/30` | `bg-slate-100 text-slate-700` |

---

## 2. Typography Hierarchy

- **H1 Display Titles:** `text-5xl md:text-7xl font-black tracking-tight leading-[1.1] text-slate-950 dark:text-white`
- **H2 Section Titles:** `text-3xl md:text-5xl font-black tracking-tight text-slate-950 dark:text-white`
- **H3 Card Titles:** `text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100`
- **Body Lead Text:** `text-lg md:text-xl text-slate-600 dark:text-slate-300 font-medium leading-relaxed`
- **Body Standard:** `text-base text-slate-600 dark:text-slate-400 leading-normal`
- **Caption / Metadata:** `text-xs md:text-sm font-semibold text-slate-500 uppercase tracking-wider`

---

## 3. Glassmorphism & Elevation Tokens

- **Card Container:**
  ```css
  @apply rounded-3xl border border-slate-200/80 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/80 backdrop-blur-xl shadow-xl shadow-black/20 transition-all duration-300 hover:shadow-2xl hover:border-slate-300 dark:hover:border-zinc-700;
  ```
- **Pill Badges:**
  ```css
  @apply inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase;
  ```
- **Primary Action Button:**
  ```css
  @apply inline-flex h-12 md:h-14 items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base px-8 shadow-xl shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95;
  ```
- **Secondary Action Button:**
  ```css
  @apply inline-flex h-12 md:h-14 items-center justify-center rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 font-bold text-base px-8 shadow-sm hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all;
  ```

---

## 4. Animation & Interaction Patterns

- **Subtle Background Grids:** `bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]`
- **Floating Accent Orbs:** `absolute rounded-full blur-3xl opacity-30 pointer-events-none animate-pulse`
- **Interactive FAQ Accordions:** Pure CSS/JS smooth expanding accordions with rotating chevron icons.
