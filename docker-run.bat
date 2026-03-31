@echo off
title DevLynx AI feed server (Docker)
cd /d "%~dp0"

docker --version >nul 2>&1
if errorlevel 1 (
  echo Docker not found. Install from https://docker.com/get-started/
  pause
  exit /b 1
)

echo Building from feed-server/ (canonical server-with-ai.js)
echo Starting DevLynx AI feed server on http://127.0.0.1:2847
docker build -t devlens-feed .
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

if not exist "feed-server\screenshots" mkdir "feed-server\screenshots"
docker run --rm -p 2847:2847 -v "%cd%\feed-server\screenshots:/app/screenshots" --name devlens-feed devlens-feed
if errorlevel 1 pause
