@echo off
cd /d "C:\Users\bhaba\inventory-management\backend"
echo.
echo ========================================
echo   INVENTORY MANAGEMENT SYSTEM STARTING
echo ========================================
echo.
echo Closing any old versions...
REM taskkill /F /IM node.exe /T >nul 2>&1
echo.
echo Starting Database and Screen...
node server.js
pause