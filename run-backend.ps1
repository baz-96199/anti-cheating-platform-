# ExamGuard AI - Backend PowerShell Runner
$env:PATH = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
$env:PYTHONPATH = "$PSScriptRoot"
Set-Location "$PSScriptRoot"
& ".\venv\Scripts\python.exe" "backend\app.py"
