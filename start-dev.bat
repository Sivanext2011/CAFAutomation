@echo off
set "DATA_DIR=%~dp0data"
set "PYTHONPATH=%~dp0"

echo Starting CAF Automation Backend on http://localhost:8000
echo Starting CAF Automation Frontend on http://localhost:5173
echo.

start "CAF-Backend" cmd /k "cd /d "%~dp0" && set "DATA_DIR=%~dp0data" && set "PYTHONPATH=%~dp0" && python -m uvicorn backend.main:app --reload --port 8000"

timeout /t 3 /nobreak >nul

start "CAF-Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Both services starting...
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo.
