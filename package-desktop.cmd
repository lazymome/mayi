@echo off
setlocal

set MODE=%~1
if "%MODE%"=="" set MODE=pack

powershell -ExecutionPolicy Bypass -File "%~dp0scripts\package-desktop.ps1" -Mode %MODE% %2 %3 %4 %5 %6 %7 %8 %9

if errorlevel 1 (
  echo.
  echo Packaging failed.
  pause
  exit /b 1
)

echo.
echo Packaging finished.
pause
