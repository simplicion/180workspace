# 180WORKSPACE VIDEO ENGINE: CODEBASE REUSE MATRIX
**Objective:** Maximize Monorepo Synergy & Prevent Duplicate Infrastructure  

---

## 1. Direct Reuse Table

| Component / Subsystem | Source in 180 Workspace | Reused For | Integration Method |
| :--- | :--- | :--- | :--- |
| **Multi-Provider AI Kernel** | `packages/domains/ai/src/kernel/` | AI Creative Director (Gemini 2.0 Flash / Haiku micro-token reasoning) | Direct import into `video-ai-director.service.ts` |
| **Subscription & Plan Gating** | `packages/domains/platform-billing/` | `useSubscription()` entitlement checks for Video Studio Pro tier | Shared domain hook + `@workspace/ui/FeatureLock` |
| **Design System & UI Primitives** | `packages/ui/src/components/` | Desktop React timeline UI, modals, buttons, sliders, badges | Direct import `@workspace/ui` into `apps/desktop-editor` |
| **Universal AI Chat Drawer** | `packages/ui/src/components/UniversalAIDrawer.tsx` | Conversational AI Director Drawer for interactive timeline tweaks | Adapted into desktop conversational copilot |
| **Universal Skeleton Loaders** | `packages/ui/src/components/Skeleton.tsx` | Layout Shift (CLS) prevention during asset import & analysis | Used in desktop media bin & inspector panels |
| **Multi-Tenant JWT Auth** | `packages/domains/identity/` | `companyId` & user token verification for desktop launch | Deep link token handshake (`workspace180://`) |
| **S3 / R2 Cloud Storage** | `apps/backend` AWS SDK clients | Cloud asset synchronization, stock library CDN caching | S3 Presigned direct chunk URLs |
| **Prisma Multi-Tenant Schema** | `packages/db/prisma/schema.prisma` | Cloud project metadata, team collaboration, render credits | New `VideoProject` & `VideoExport` models |
| **Turborepo & pnpm Setup** | Root `turbo.json` & `pnpm-workspace.yaml` | Unified build, lint, and typecheck pipeline across monorepo | Extended with `apps/desktop-editor` |

---

## 2. What Must Be Built New (The Engine Core)

| Subsystem | Target Location | Rationale & Tech Stack |
| :--- | :--- | :--- |
| **Tauri v2 Shell** | `apps/desktop-editor` | Lightweight native window shell with hardware GPU access |
| **Native Rust Core** | `native/video-engine-core` | High-performance LibAV/FFmpeg bindings, frame decoders, and timeline timebase |
| **wgpu Compositor** | `crates/engine-gpu` | Hardware-accelerated 60fps live canvas & shader filter pipeline |
| **Smart Stream Splicer** | `crates/engine-render` | LosslessCut-inspired zero-loss copy of untouched timeline intervals |
| **Object Attention Engine** | `crates/engine-tracking` | Universal tracking abstraction for faces, cursors, products, and screen ROIs |
| **Edit IR Specification** | `packages/video-contracts` | Versioned, deterministic Abstract Syntax Tree (AST) schema |
| **Web Hub Launcher Page** | `apps/frontend/app/(platform)/...` | Marketing, project dashboard, and desktop app deep linker |

---

## 3. Anti-Duplication Enforcement Rules
1. **Never create a new UI button or card**: All desktop editor atomic components must import directly from `@workspace/ui`.
2. **Never create a parallel auth system**: The desktop editor authenticates solely by validating signed JWTs from `@workspace/identity`.
3. **Never bypass `companyId` isolation**: All cloud-synced projects, assets, and AI metrics must be scoped to the active tenant.
