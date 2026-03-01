@echo off
chcp 65001 >nul 2>nul
title Stop Services

echo ====================================================
echo    Stopping Skill Agent Services...
echo ====================================================
echo.

echo Stopping Backend...
taskkill /FI "WINDOWTITLE eq Skill-Agent-Backend*" /F >nul 2>nul

echo Stopping Frontend...
taskkill /FI "WINDOWTITLE eq Skill-Agent-Frontend*" /F >nul 2>nul

echo Stopping Node processes on ports 3000 and 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>nul

echo.
echo ====================================================
echo    All services stopped.
echo ====================================================
echo.
pause
