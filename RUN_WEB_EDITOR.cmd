@echo off
setlocal
cd /d "%~dp0"
title DEZUS WEB EDITOR
where node >nul 2>nul
if errorlevel 1 (echo Please install Node.js LTS.& pause & exit /b 1)
if not exist node_modules\express (npm install --no-audit --no-fund --omit=dev)
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3076" ^| findstr "LISTENING"') do taskkill /PID %%P /F >nul 2>nul
set PORT=3076
start "" "http://localhost:3076/visual-editor.html?mode=web&v=4.128"
npm start
pause
