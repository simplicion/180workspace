import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// platform -> [download file name, env var holding the URL of the published (signed) release asset]
const ARTIFACTS: Record<string, [string, string]> = {
  windows: ["180Workspace-Setup-x64.exe", "DESKTOP_DOWNLOAD_URL_WINDOWS"],
  win: ["180Workspace-Setup-x64.exe", "DESKTOP_DOWNLOAD_URL_WINDOWS"],
  msi: ["180Workspace-Setup-x64.exe", "DESKTOP_DOWNLOAD_URL_WINDOWS"],
  mac: ["180Workspace-AppleSilicon.dmg", "DESKTOP_DOWNLOAD_URL_MAC"],
  mac_intel: ["180Workspace-x64.dmg", "DESKTOP_DOWNLOAD_URL_MAC_INTEL"],
  linux: ["180Workspace-x86_64.AppImage", "DESKTOP_DOWNLOAD_URL_LINUX"],
  linux_deb: ["180Workspace-amd64.deb", "DESKTOP_DOWNLOAD_URL_LINUX_DEB"],
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const platform = ((await params)?.platform || "").toLowerCase();
  const artifact = ARTIFACTS[platform];
  if (!artifact) {
    return NextResponse.json({ error: "UNKNOWN_PLATFORM", message: "Unknown platform" }, { status: 400 });
  }
  const [fileName, urlEnv] = artifact;

  // 1. Preferred: the release asset published by CI (GitHub Releases / CDN), configured per platform.
  const releaseUrl = process.env[urlEnv];
  if (releaseUrl && /^https:\/\//i.test(releaseUrl)) {
    return NextResponse.redirect(releaseUrl, 302);
  }

  // 2. Legacy (Windows only): an installer file shipped alongside the app, kept until the Tauri release pipeline is live.
  if (fileName.endsWith(".exe")) {
    const candidates = [
      path.resolve(process.cwd(), "public/downloads/180Workspace-Setup-x64.exe"),
      path.resolve(process.cwd(), "../desktop-app/windows/180Workspace-Setup-x64.exe"),
    ];
    try {
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const file = fs.readFileSync(p);
          return new NextResponse(file, {
            status: 200,
            headers: {
              "Content-Disposition": `attachment; filename="${fileName}"`,
              "Content-Type": "application/vnd.microsoft.portable-executable",
              "Content-Length": file.length.toString(),
              "Cache-Control": "public, max-age=3600",
            },
          });
        }
      }
    } catch {
      // No filesystem (e.g. an edge runtime): fall through to "not available".
    }
  }

  // 3. Never hand out something that is not the installer for the requested platform.
  return NextResponse.json(
    { error: "INSTALLER_NOT_AVAILABLE", message: "The desktop installer for this platform has not been published yet.", platform },
    { status: 404 }
  );
}
