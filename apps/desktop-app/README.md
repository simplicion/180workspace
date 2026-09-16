# 180 Workspace Desktop Application

The native desktop host for the entire **180 Workspace** platform (Windows, macOS, Linux).

---

## ??? Architecture Overview

The 180 Workspace desktop client provides a zero-latency, hardware-accelerated desktop wrapper around the unified workspace web platform:

`
apps/desktop-app/
+-- package.json               # @workspace/desktop-app workspace package
+-- README.md                  # Developer & architecture documentation
+-- windows/                   # Lightweight native Windows C# / WebView2 Host
¦   +-- Launcher.cs            # Host runtime with workspace180:// deep link & hardware injection
¦   +-- Installer.cs           # Self-extracting setup installer with registry protocol registration
¦   +-- build-windows.ps1      # Automated compilation script (uses csc.exe)
¦   +-- app.ico                # 180 Workspace application icon
¦   +-- 180Workspace.exe       # Compiled native executable
¦   +-- 180Workspace-Setup-x64.exe # Compiled installer executable
+-- src-tauri/                 # Cross-platform Tauri v2 Rust container (macOS/Linux/Windows)
    +-- tauri.conf.json        # Tauri configuration (deep links, window bounds)
    +-- Cargo.toml             # Rust dependencies (connects to native/video-engine-core)
    +-- src/                   # Native IPC commands and telemetry hooks
`

---

## ? Key Capabilities

1. **Hardware Acceleration Bridge (window.__180_NATIVE__):**
   - Automatically injected into all page loads before execution.
   - Provides direct access to GPU shaders (Direct3D 12, Vulkan, Metal), local file system paths, and NVENC/AMF video stream copying.

2. **Deep Link Protocol (workspace180://):**
   - Direct routing to any workspace module or project:
     - workspace180://media-editor?project=abc
     - workspace180://crm/deals
     - workspace180://advertising
   - Automatically registered in the OS on installation and startup.

3. **Development Auto-Discovery:**
   - Auto-detects running Next.js development server at http://localhost:3002, http://localhost:3000, or fallback ports.

---

## ?? Building & Running

### Windows Native Host:
`ash
# From workspace root
pnpm --filter @workspace/desktop-app run build:windows

# Or directly in powershell
cd apps/desktop-app/windows
powershell -ExecutionPolicy Bypass -File .\build-windows.ps1
`

### Cross-Platform Tauri (macOS, Linux, Windows):
`ash
# Development mode
pnpm --filter @workspace/desktop-app run dev:tauri

# Production bundle
pnpm --filter @workspace/desktop-app run build:tauri
`

