@echo off
title ExamGuard AI - Backend API Server
echo ========================================================
echo   ExamGuard AI - Starting Backend API on Port 5000
echo   Connected to MySQL: root@localhost:3306/examguard_db
echo ========================================================

cd /d "%~dp0"
set PYTHONPATH=%cd%

if exist ".\venv\Scripts\python.exe" (
    ".\venv\Scripts\python.exe" backend\app.py
) else (
    python backend\app.py
)

pause
