@echo off
chcp 65001 >nul
title 幻图 Web  -  http://127.0.0.1:3100
cd /d "%~dp0"

set "TOONFLOW_SERVER_PORT=3100"
set "TOONFLOW_CHANNEL=local"

set "BUN="
where bun >nul 2>&1 && set "BUN=bun"
if not defined BUN if exist "%USERPROFILE%\.workbuddy\binaries\node\versions\22.22.2-6\node_modules\bun\bin\bun.exe" set "BUN=%USERPROFILE%\.workbuddy\binaries\node\versions\22.22.2-6\node_modules\bun\bin\bun.exe"
if not defined BUN if exist "%USERPROFILE%\.bun\bin\bun.exe" set "BUN=%USERPROFILE%\.bun\bin\bun.exe"

if not defined BUN (
  echo [ERROR] bun.exe not found. Install:  npm install -g bun@1.4.3
  pause
  exit /b 1
)

netstat -ano | findstr ":3100" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
  echo Port 3100 already running - opening browser.
  start "" "http://127.0.0.1:3100"
  exit /b 0
)

echo ============================================
echo   幻图 Web  -  http://127.0.0.1:3100
echo   Data: %~dp0data
echo   Keep this window open. Close it to stop.
echo ============================================
echo.

"%BUN%" run start:server

echo.
echo Server stopped.
pause
