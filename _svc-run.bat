@echo off
chcp 65001 >nul
cd /d D:\toonflow-app
set "TOONFLOW_SERVER_PORT=3000"
rem ACT: private deployment keeps the local channel; remove the next line to restore official services.
set "TOONFLOW_CHANNEL=local"
set "PATH=C:\Users\EDY\.workbuddy\binaries\node\versions\22.22.2-6;%PATH%"
"C:\Users\EDY\.workbuddy\binaries\node\versions\22.22.2-6\node_modules\bun\bin\bun.exe" run start:server > "D:\toonflow-app\data\server.log" 2>&1
