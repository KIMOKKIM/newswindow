@echo off
REM Start backend and static server for local development (Windows)
REM Opens two new cmd windows
start "Backend" cmd /k "cd /d %~dp0\backend && node server.js"
start "Static" cmd /k "cd /d %~dp0 && node scripts\serve-static.js"
echo Started backend and static server in new windows.
echo Backend: http://127.0.0.1:3000
echo Static:  http://127.0.0.1:5500
pause

