@echo off
title World Tycoon: Global Edition
cd /d "%~dp0"
if exist "WorldTycoon.exe" (
    start "" "WorldTycoon.exe" %*
    exit /b
)
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
