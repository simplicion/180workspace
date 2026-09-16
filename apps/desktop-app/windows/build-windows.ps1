# 180 Workspace - Native Desktop Packaging Script
$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "180 Workspace: Building Unified Native Desktop App" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktopEditorDir = Split-Path -Parent $scriptDir
$workspaceRoot = Split-Path -Parent (Split-Path -Parent $desktopEditorDir)
$distDir = Join-Path $desktopEditorDir "dist"
$binDir = Join-Path $scriptDir "bin"
$icoPath = Join-Path $scriptDir "app.ico"
$launcherCs = Join-Path $scriptDir "Launcher.cs"
$installerCs = Join-Path $scriptDir "Installer.cs"
$cscPath = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

if (-not (Test-Path $cscPath)) {
    throw "csc.exe not found at $cscPath"
}

# 1. Ensure bin directory and WebView2 dependencies
if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
}

$wv2CoreDll = Join-Path $binDir "Microsoft.Web.WebView2.Core.dll"
$wv2WinFormsDll = Join-Path $binDir "Microsoft.Web.WebView2.WinForms.dll"
$wv2LoaderDll = Join-Path $binDir "WebView2Loader.dll"

# Check if DLLs exist in LocalAppData
$localAppDesktop = Join-Path $env:LOCALAPPDATA "180Workspace\Desktop"
$localAppStudio = Join-Path $env:LOCALAPPDATA "180Workspace\MediaStudio"

if (Test-Path $localAppStudio) {
    if (-not (Test-Path $wv2CoreDll) -and (Test-Path (Join-Path $localAppStudio "Microsoft.Web.WebView2.Core.dll"))) {
        Copy-Item (Join-Path $localAppStudio "Microsoft.Web.WebView2.Core.dll") $binDir -Force
    }
    if (-not (Test-Path $wv2WinFormsDll) -and (Test-Path (Join-Path $localAppStudio "Microsoft.Web.WebView2.WinForms.dll"))) {
        Copy-Item (Join-Path $localAppStudio "Microsoft.Web.WebView2.WinForms.dll") $binDir -Force
    }
    if (-not (Test-Path $wv2LoaderDll) -and (Test-Path (Join-Path $localAppStudio "WebView2Loader.dll"))) {
        Copy-Item (Join-Path $localAppStudio "WebView2Loader.dll") $binDir -Force
    }
}

# 2. Compile Launcher.cs -> 180Workspace.exe & 180MediaStudio.exe
Write-Host "[1/4] Compiling native Windows Launcher (180Workspace.exe)..." -ForegroundColor Yellow
$workspaceExe = Join-Path $scriptDir "180Workspace.exe"
$mediaStudioExe = Join-Path $scriptDir "180MediaStudio.exe"

$launcherArgs = @(
    "/target:winexe",
    "/platform:x64",
    "/optimize+",
    "/win32icon:$icoPath",
    "/reference:System.dll,System.Drawing.dll,System.Windows.Forms.dll,$wv2WinFormsDll,$wv2CoreDll",
    "/out:$workspaceExe",
    $launcherCs
)

& $cscPath $launcherArgs
if ($LASTEXITCODE -ne 0) {
    throw "Launcher compilation failed with exit code $LASTEXITCODE"
}
Copy-Item $workspaceExe $mediaStudioExe -Force
Copy-Item $workspaceExe $binDir -Force
Copy-Item $mediaStudioExe $binDir -Force
Write-Host "180 Workspace Launcher compiled successfully: $workspaceExe" -ForegroundColor Green

# 3. Compile Installer.cs -> 180Workspace-Setup-x64.exe
Write-Host "[2/4] Compiling native standalone installer (180Workspace-Setup-x64.exe)..." -ForegroundColor Yellow
$setupExe = Join-Path $scriptDir "180Workspace-Setup-x64.exe"
$setupMediaExe = Join-Path $scriptDir "180MediaStudio-Setup-x64.exe"

$installerArgs = @(
    "/target:winexe",
    "/platform:x64",
    "/optimize+",
    "/win32icon:$icoPath",
    "/reference:System.dll,System.Drawing.dll,System.Windows.Forms.dll",
    "/out:$setupExe",
    $installerCs
)

& $cscPath $installerArgs
if ($LASTEXITCODE -ne 0) {
    throw "Installer compilation failed with exit code $LASTEXITCODE"
}
Copy-Item $setupExe $setupMediaExe -Force
Write-Host "180 Workspace Installer compiled successfully: $setupExe" -ForegroundColor Green

# 4. Deploy & Install to %LOCALAPPDATA%\180Workspace\Desktop
Write-Host "[3/4] Deploying to $localAppDesktop..." -ForegroundColor Yellow
if (-not (Test-Path $localAppDesktop)) {
    New-Item -ItemType Directory -Path $localAppDesktop -Force | Out-Null
}

$wwwrootInstalled = Join-Path $localAppDesktop "wwwroot"
if (Test-Path $distDir) {
    if (Test-Path $wwwrootInstalled) {
        Remove-Item $wwwrootInstalled -Recurse -Force -ErrorAction SilentlyContinue
    }
    New-Item -ItemType Directory -Path $wwwrootInstalled -Force | Out-Null
    Copy-Item "$distDir\*" $wwwrootInstalled -Recurse -Force
}

# Copy executables and DLLs
Copy-Item $workspaceExe $localAppDesktop -Force
Copy-Item $mediaStudioExe $localAppDesktop -Force
Copy-Item $icoPath $localAppDesktop -Force
if (Test-Path $wv2CoreDll) { Copy-Item $wv2CoreDll $localAppDesktop -Force }
if (Test-Path $wv2WinFormsDll) { Copy-Item $wv2WinFormsDll $localAppDesktop -Force }
if (Test-Path $wv2LoaderDll) { Copy-Item $wv2LoaderDll $localAppDesktop -Force }

# 5. Register workspace180:// Protocol & Desktop Shortcuts
Write-Host "[4/4] Registering workspace180:// protocol & Desktop shortcuts..." -ForegroundColor Yellow
$destExe = Join-Path $localAppDesktop "180Workspace.exe"
$regKey = "HKCU:\Software\Classes\workspace180"
if (-not (Test-Path $regKey)) {
    New-Item -Path $regKey -Force | Out-Null
}
Set-ItemProperty -Path $regKey -Name "(Default)" -Value "URL:180 Workspace Protocol"
Set-ItemProperty -Path $regKey -Name "URL Protocol" -Value ""

$iconKey = "$regKey\DefaultIcon"
if (-not (Test-Path $iconKey)) { New-Item -Path $iconKey -Force | Out-Null }
Set-ItemProperty -Path $iconKey -Name "(Default)" -Value "`"$icoPath`",0"

$cmdKey = "$regKey\shell\open\command"
if (-not (Test-Path $cmdKey)) { New-Item -Path $cmdKey -Force | Out-Null }
Set-ItemProperty -Path $cmdKey -Name "(Default)" -Value "`"$destExe`" `"%1`""

# Create desktop shortcuts
$desktopPath = [Environment]::GetFolderPath("DesktopDirectory")
$shortcutFile = Join-Path $desktopPath "180 Workspace.lnk"
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($shortcutFile)
$sc.TargetPath = $destExe
$sc.WorkingDirectory = $localAppDesktop
$sc.IconLocation = "$icoPath,0"
$sc.Description = "180 Workspace - Universal Enterprise Platform & Studio"
$sc.Save()

Write-Host "====================================================" -ForegroundColor Green
Write-Host "Build Complete! 180 Workspace Native Engine is Ready." -ForegroundColor Green
Write-Host "Executable: $destExe" -ForegroundColor Green
Write-Host "Installer:  $setupExe" -ForegroundColor Green
Write-Host "Protocol:   workspace180://" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green

