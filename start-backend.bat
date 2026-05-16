@echo off
cd /d "%~dp0"
set "DATA_DIR=%~dp0data"
set "PYTHONPATH=%~dp0"
echo DATA_DIR=%DATA_DIR%
echo PYTHONPATH=%PYTHONPATH%
echo.
echo Starting backend on http://localhost:8000 ...
python -m uvicorn backend.main:app --reload --port 8000
