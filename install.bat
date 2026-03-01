@echo off
chcp 65001 >nul
echo ========================================
echo    Skill Agent System - Install
echo ========================================
echo.

echo [1/4] Checking frontend dependencies...
if exist "frontend\node_modules" (
    echo [OK] Frontend dependencies already installed, skipping
) else (
    echo [+] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo [OK] Frontend dependencies installed
)

echo.
echo [2/4] Checking backend dependencies...
if exist "backend\node_modules" (
    echo [OK] Backend dependencies already installed, skipping
) else (
    echo [+] Installing backend dependencies...
    cd backend
    call npm install
    cd ..
    echo [OK] Backend dependencies installed
)

echo.
echo ========================================
echo    Installation Complete!
echo ========================================
echo.
echo Please run start.bat to launch the project
echo.
pause
