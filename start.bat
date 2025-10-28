@echo off
echo Starting Kinma Launcher...
powershell -ExecutionPolicy Bypass -File "%~dp0start.ps1"
if errorlevel 1 (
    pause
)