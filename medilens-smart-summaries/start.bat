@echo off
title MediLens — Starting frontend and backend
color 0A

echo.
echo  ==========================================
echo   MediLens — Starting Development Servers
echo  ==========================================
echo.

REM ── Backend ──────────────────────────────────
echo [1/3] Checking Python virtual environment...
set RECREATE_VENV=0
if not exist "backend\venv\Scripts\activate.bat" (
    set RECREATE_VENV=1
) else (
    backend\venv\Scripts\python.exe -c "import sys" 2>nul
    if errorlevel 1 set RECREATE_VENV=1
)

if "%RECREATE_VENV%"=="1" (
    echo       Creating clean venv for this machine...
    if exist "backend\venv" rmdir /s /q "backend\venv"
    cd backend
    python -m venv venv
    cd ..
)

echo [2/3] Starting FastAPI backend on port 8000...
start "MediLens Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\activate && pip install -r requirements.txt --quiet && uvicorn main:app --reload --port 8000"

REM Give the backend a few seconds to start
timeout /t 4 /nobreak >nul

REM ── Frontend ─────────────────────────────────
echo [3/3] Starting Vite frontend...
start "MediLens Frontend" cmd /k "cd /d %~dp0frontend && npm install --silent && npm run dev"

echo.
echo  ==========================================
echo   MediLens is starting up!
echo.
echo   Frontend → http://localhost:8082
echo   Backend  → http://localhost:8000
echo   API docs → http://localhost:8000/docs
echo.
echo   Doctor login:  doctor@medilens.demo  (Dr. Anjali Mehta)
echo   Patient login: patient@medilens.demo (Ravi Kumar)
echo   Password:      MediLens@123
echo  ==========================================
echo.
echo  Two windows have opened — one for each server.
echo  Close this window once both are running.
echo.
pause
