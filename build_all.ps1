param()

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   BUILDING WORLD TYCOON STANDALONE PACKAGES              " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# When running in GitHub Actions CI, ensure debug mode is disabled for all released packages
if ($env:GITHUB_ACTIONS -eq "true" -or $env:CI -eq "true" -or $env:WT_NO_DEBUG -eq "true") {
    Write-Host "`n[CI Release Build] Stripping debug mode for distribution artifacts..." -ForegroundColor Yellow
    if (Test-Path "$PSScriptRoot\scripts\set-debug-mode.ps1") {
        & "$PSScriptRoot\scripts\set-debug-mode.ps1" -Disable
    } elseif (Test-Path "$PSScriptRoot\scripts\set-debug-mode.js") {
        node "$PSScriptRoot\scripts\set-debug-mode.js" --disable
    }
}

# 1. Build Windows Asset Zip & Standalone .EXE
Write-Host "`n[1/3] Packaging Windows Game Assets & Compiling WorldTycoon.exe..." -ForegroundColor Magenta
& "$PSScriptRoot\build_zip.ps1"
& "$PSScriptRoot\build_exe.ps1"
& "$PSScriptRoot\package_distribution.ps1"

# 2. Build macOS App Bundle & Mac Package Zip
Write-Host "`n[2/3] Building macOS Native App Bundle (WorldTycoon.app)..." -ForegroundColor Magenta
& "$PSScriptRoot\build_mac.ps1"

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "   BUILD COMPLETE FOR BOTH PLATFORMS!                     " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Windows Standalone EXE : $PSScriptRoot\WorldTycoon.exe" -ForegroundColor Yellow
Write-Host "Windows Package Zip    : $PSScriptRoot\WorldTycoon_Online_Game.zip" -ForegroundColor Yellow
Write-Host "macOS Package Zip      : $PSScriptRoot\WorldTycoon-Mac.zip" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
