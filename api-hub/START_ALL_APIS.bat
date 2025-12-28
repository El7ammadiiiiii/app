@echo off
echo ================================================
echo   Starting ALL APIs - NEXUS Complete System
echo ================================================
echo.

:: Activate virtual environment
echo [1/4] Activating Python environment...
call ..\..\.venv\Scripts\activate.bat

:: Start Blockchain API (Omnichain)
echo.
echo [2/4] Starting Blockchain API on port 8000...
start "Blockchain API" cmd /k "cd blockchain && python main.py --mode api --port 8000"
timeout /t 3 >nul

:: Start Technical Analysis API
echo.
echo [3/4] Starting Technical Analysis API on port 8001...
start "Technical API" cmd /k "cd technical && python api.py"
timeout /t 3 >nul

:: Start ML APIs
echo.
echo [4/4] Starting ML APIs...
start "Supreme V7 API" cmd /k "cd ml && python supreme-api.py --port 8765"
timeout /t 2 >nul
start "Elite API" cmd /k "cd ml && python elite-api.py --port 8766"

echo.
echo ================================================
echo   ALL APIs STARTED SUCCESSFULLY!
echo ================================================
echo.
echo   Blockchain API:    http://localhost:8000/docs
echo   Technical API:     http://localhost:8001/docs
echo   Supreme V7 API:    http://localhost:8765
echo   Elite API:         http://localhost:8766
echo.
echo ================================================
echo Press any key to monitor all terminals...
pause >nul
