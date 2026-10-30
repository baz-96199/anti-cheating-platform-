# ExamGuard AI - Frontend PowerShell Runner
$env:PATH = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
Set-Location "$PSScriptRoot\frontend"
npm run dev
