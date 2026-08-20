@echo off
setlocal
cd /d "%~dp0"
title DEZUS STORE OPS
cls
echo ==========================================
echo DEZUS STORE OPS
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Please install Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)

if not exist package.json (
  echo ERROR: package.json not found.
  echo Please extract the ZIP first, then run RUN_WEB.cmd inside the web folder.
  pause
  exit /b 1
)

if not exist node_modules\express (
  goto :install_packages
)
if not exist node_modules\xlsx (
  goto :install_packages
)
goto :packages_ready

:install_packages
  echo Installing packages. First time may take a few minutes...
  npm install --no-audit --no-fund --omit=dev
  if errorlevel 1 (
    echo Install failed. Please send this screenshot to ChatGPT.
    pause
    exit /b 1
  )

:packages_ready

echo.
echo Checking old Dezus Store Ops process on port 3076...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3076" ^| findstr "LISTENING"') do (
  echo Closing old process PID %%P...
  taskkill /PID %%P /F >nul 2>nul
)

timeout /t 1 /nobreak >nul

echo.
echo Starting Dezus Store Ops V4.133...
echo Open browser: http://localhost:3076
echo Login: admin / 123456
echo.
set PORT=3076
start "" "http://localhost:3076/?v=4.133"
npm start
pause
