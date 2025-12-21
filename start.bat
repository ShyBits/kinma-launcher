@echo off
if "%1"=="" (
    echo Starting Kinma Launcher...
    powershell -ExecutionPolicy Bypass -File "%~dp0start.ps1"
) else (
    echo Starting Kinma Launcher...
    powershell -ExecutionPolicy Bypass -File "%~dp0start.ps1" %1
)
if errorlevel 1 (
    pause
)