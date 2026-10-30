@echo off
title ExamGuard AI - Frontend Dev Server
echo ========================================================
echo   ExamGuard AI - Starting Frontend on Port 5173
echo ========================================================

cd /d "%~dp0"

REM Configure Node.js path automatically
set "NODE_WINGET_PATH=C:\Users\HP\AppData\Local\Microsoft\WinGet\Packages\OpenJS.NodeJS.LTS_Microsoft.Winget.Source_8wekyb3d8bbwe\node-v24.20.0-win-x64"
if exist "%NODE_WINGET_PATH%" (
    set "PATH=%NODE_WINGET_PATH%;%PATH%"
)

cd frontend

echo Checking Node.js environment...
node -v
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js was not detected. Please install Node.js LTS or restart your terminal.
    pause
    exit /b 1
)

echo Starting Vite React Dev Server...
call npm.cmd run dev
if %ERRORLEVEL% NEQ 0 (
    echo Retrying with direct node vite runner...
    node node_modules\vite\bin\vite.js
)

pause
