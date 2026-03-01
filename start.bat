@echo off
chcp 65001 >nul 2>nul
title Skill Agent System

echo ====================================================
echo    Skill Agent System - Starting...
echo ====================================================
echo.

cd /d "%~dp0"

echo [1/4] Checking dependencies...
if not exist "frontend\node_modules" (
    echo [+] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)
if not exist "backend\node_modules" (
    echo [+] Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)
echo [OK] Dependencies ready

echo.
echo [2/4] Starting Backend...
start "Skill-Agent-Backend" cmd /c "cd /d %~dp0backend && npm run dev"
ping 127.0.0.1 -n 4 >nul

echo [3/4] Starting Frontend...
start "Skill-Agent-Frontend" cmd /c "cd /d %~dp0frontend && npm run dev"
ping 127.0.0.1 -n 6 >nul

echo [4/4] Opening Browser...
start "" "http://localhost:5173"

echo.
echo ====================================================
echo    Services Started!
echo    Backend:  http://localhost:3000
echo    Frontend: http://localhost:5173
echo ====================================================
echo.
echo Press any key to exit this window...
pause >nul
