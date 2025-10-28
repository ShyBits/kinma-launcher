# Kinma Launcher Startup Script
$ErrorActionPreference = "Stop"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "   Kinma Launcher Startup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Select mode:"
Write-Host "  1. Development Mode (with hot reload)"
Write-Host "  2. Production Mode (built app)"
Write-Host ""

$choice = Read-Host "Enter choice (1 or 2)"

Write-Host ""

# Setup cleanup function
function Cleanup-Processes {
    Write-Host "`nCleaning up processes..." -ForegroundColor Yellow
    
    # Kill processes on port 3000
    Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    
    # Kill node and electron processes
    Get-Process -Name "node","electron" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Host "Cleanup complete." -ForegroundColor Green
}

# Register cleanup on exit
Register-EngineEvent PowerShell.Exiting -Action { Cleanup-Processes }

try {
    if ($choice -eq "1") {
        Write-Host "Starting in Development Mode..." -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop all processes`n" -ForegroundColor Yellow
        npm run electron-dev
    }
    elseif ($choice -eq "2") {
        Write-Host "Building for Production..." -ForegroundColor Green
        npm run build
        Write-Host ""
        Write-Host "Build complete! Starting Electron..." -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop all processes`n" -ForegroundColor Yellow
        npm run electron
    }
    else {
        Write-Host "Invalid choice. Starting in Development Mode..." -ForegroundColor Yellow
        Write-Host "Press Ctrl+C to stop all processes`n" -ForegroundColor Yellow
        npm run electron-dev
    }
}
finally {
    Cleanup-Processes
}
