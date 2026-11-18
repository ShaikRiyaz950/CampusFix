# Start both the CampusFix Flask backend (port 5000) and Vite frontend dev server (port 5173)
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Starting CampusFix Flask backend on http://127.0.0.1:5000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root'; .\backend\venv\Scripts\python.exe .\backend\app.py"

Write-Host "Starting CampusFix React frontend on http://127.0.0.1:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"
