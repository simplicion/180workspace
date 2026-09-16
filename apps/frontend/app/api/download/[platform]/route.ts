import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const resolvedParams = await params;
  const platform = resolvedParams?.platform?.toLowerCase() || "windows";

  const fileNameMap: Record<string, string> = {
    windows: "180Workspace-Setup-x64.exe",
    win: "180Workspace-Setup-x64.exe",
    msi: "180Workspace-Setup-x64.exe",
    mac: "180Workspace-Universal.dmg",
    mac_intel: "180Workspace-x64.dmg",
    linux: "180Workspace-x86_64.AppImage",
    linux_deb: "180Workspace-amd64.deb",
    android: "180Workspace-v1.0.apk",
    apk: "180Workspace-v1.0.apk",
  };

  const fileName = fileNameMap[platform] || "180Workspace-Setup-x64.exe";

  const candidatePaths = [
    path.resolve(process.cwd(), "public/downloads/180Workspace-Setup-x64.exe"),
    path.resolve(process.cwd(), "../marketing-web/public/downloads/180Workspace-Setup-x64.exe"),
    path.resolve(process.cwd(), "../desktop-app/windows/180Workspace-Setup-x64.exe"),
    path.resolve(process.cwd(), "../desktop-app/windows/180Workspace.exe"),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      const fileBuffer = fs.readFileSync(p);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Type": "application/vnd.microsoft.portable-executable",
          "Content-Length": fileBuffer.length.toString(),
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  }

  return NextResponse.redirect(new URL(`/downloads/180Workspace-Setup-x64.exe`, request.url));
}
