@echo off
cd /d "C:\Users\bhaba\inventory-management\backend"
echo.
echo ========================================
echo   INVENTORY MANAGEMENT SYSTEM STARTING
echo ========================================
echo.
echo Closing any old versions...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do taskkill /F /PID %%a >nul 2>&1
echo.
echo Starting Database and Screen...
node server.js
pause