@echo off
title DevLynx AI feed server (Docker)
cd /d "%~dp0"

docker --version >nul 2>&1
if errorlevel 1 (
  echo Docker not found. Install from https://docker.com/get-started/
  pause
  exit /b 1
)

echo Building and starting DevLynx AI feed server on http://127.0.0.1:2847
docker build -t devlens-feed .
if errorlevel 1 (
  echo Build failed.
  pause
  exit /b 1
)

docker run --rm -p 2847:2847 -v "%cd%\screenshots:/app/screenshots" --name devlens-feed devlens-feed
if errorlevel 1 pause
