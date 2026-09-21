# 180 Workspace Desktop App

One desktop app for the **whole** 180 Workspace platform (Windows, macOS, Linux), built with Tauri v2. It gives users:

- the full workspace in a native window, with **offline support** (the web app's local database and sync engine, plus a service worker);
- **all media processing**: video editing and everything that needs FFmpeg runs only here, never in the browser (browsers show a "download the app" screen);
- native file pickers, `workspace180://` deep links, single-instance behaviour.

Design, edge-case matrix and roadmap: [`docs/offline-desktop/PRODUCTION_PLAN.md`](../../docs/offline-desktop/PRODUCTION_PLAN.md).

## Layout

```
apps/desktop-app/
├─ shell/index.html          local bootstrap page (works offline): checks the app origin, then navigates to it
├─ scripts/prepare-sidecars.mjs   copies FFmpeg/FFprobe into src-tauri/binaries (per target triple)
├─ src-tauri/
│  ├─ tauri.conf.json        bundle, CSP, deep-link scheme, sidecars
│  ├─ capabilities/main.json which IPC commands the web content may call (least privilege)
│  ├─ build.rs               declares the app commands that capabilities can grant
│  ├─ src/lib.rs             window creation, deep links, single instance, native detection script
│  └─ src/media.rs           probe / transcode commands (path allowlist, fixed FFmpeg arguments)
└─ windows/                  LEGACY C# + WebView2 launcher (see below)
```

## Develop

Prerequisites: Rust (stable), the platform's WebView (WebView2 on Windows, WebKitGTK on Linux), Node 24, pnpm 9.

```bash
pnpm install
pnpm --filter frontend dev                       # web app on http://localhost:3002
# in another terminal, with the dev origin:
WORKSPACE180_APP_ORIGIN=http://localhost:3002 pnpm --filter @workspace/desktop-app run dev:tauri
```

`WORKSPACE180_APP_ORIGIN` is honoured **only in debug builds**. Release builds use the compiled-in origin
(`https://app.180workspace.com`, or the value of `WORKSPACE180_APP_ORIGIN` at *compile* time for a staging build), so a
user-set environment variable can never redirect a shipped app to another site.

To use the video editor in a plain browser while developing the web app, set `NEXT_PUBLIC_ALLOW_BROWSER_MEDIA_EDITOR=true` in
`apps/frontend/.env.local`. Never set it in production.

## Build a release locally

```bash
pnpm --filter @workspace/desktop-app run build:tauri     # prepares sidecars, then `tauri build`
```

Installers appear in `src-tauri/target/release/bundle/`. Official releases are built by
`.github/workflows/desktop-release.yml` on a `desktop-v*` tag.

## Before the first public release

Not optional; see "Release prerequisites" in the production plan:

1. **FFmpeg licence.** The bundled Windows `ffmpeg.exe` is GPLv3. Redistribution requires GPL compliance (licence text + source offer) or an LGPL-only build. Get this reviewed.
2. **Code signing.** Windows Authenticode certificate and Apple Developer ID + notarization, otherwise users get OS security warnings.
3. **Updater.** Generate a signing key (`pnpm tauri signer generate`), add the `tauri-plugin-updater`, and publish an update manifest. Not wired yet.
4. **First compile.** The Rust in `src-tauri/` was written without a Rust toolchain available and has never been compiled. Expect to fix small API mismatches on the first `cargo build`.

## Legacy launcher (`windows/`)

The C# WebView2 launcher and its `.exe` files predate the Tauri app. They defaulted to a local dev server, contain hard-coded
developer paths, and serve a stale Vite bundle as their "offline" fallback. Do not ship them. Delete `windows/` and the
`build:windows` script once the Tauri build has been verified on a clean Windows machine.
