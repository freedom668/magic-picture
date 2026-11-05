@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "TOONFLOW_SERVER_PORT=3100"
rem ACT: 私有化部署只走本地渠道；删除下一行可恢复官方服务。
set "TOONFLOW_CHANNEL=local"
set "PATH=C:\Users\EDY\.workbuddy\binaries\node\versions\22.22.2-6;%PATH%"
"C:\Users\EDY\.workbuddy\binaries\node\versions\22.22.2-6\node_modules\bun\bin\bun.exe" run start:server > "%~dp0data\server.log" 2>&1
