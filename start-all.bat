@echo off
title ExamGuard AI Platform Launcher
echo ========================================================
echo   ExamGuard AI - AI-Powered Anti-Cheating Platform
echo   Launching Full-Stack Application
echo ========================================================

cd /d "%~dp0"

echo [1/3] Starting Backend API Server (Port 5000)...
start "ExamGuard Backend API" cmd /k run-backend.bat

echo [2/3] Waiting 4 seconds for API initialization...
timeout /t 4 /nobreak >nul

echo [3/3] Starting Frontend Dev Server (Port 5173)...
start "ExamGuard Frontend Web UI" cmd /k run-frontend.bat

echo.
echo ========================================================
echo Both servers are active!
echo Frontend Web Dashboard: http://localhost:5173
echo Backend REST API:       http://localhost:5000
echo MySQL Database:         examguard_db (root@localhost:3306)
echo ========================================================
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul
start http://localhost:5173
