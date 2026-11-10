@echo off
title Forge AI Squat Analyser
echo ========================================================
echo   Starting Forge AI Squat Analyser
echo   Backend:  http://localhost:7860
echo   Frontend: http://localhost:5173
echo ========================================================

:: Start Backend in a separate window
start "Forge Backend (FastAPI)" cmd /k "cd /d "%~dp0" && set PYTHONPATH=backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 7860"

:: Start Frontend in a separate window
start "Forge Frontend (Vite)" cmd /k "cd /d "%~dp0frontend" && npx vite --host --port 5173"

echo.
echo Both servers have been launched in separate windows!
echo Opening browser to http://localhost:5173 ...
timeout /t 3 >nul
start http://localhost:5173

