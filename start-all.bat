@echo off
TITLE Manas App Launcher
echo ===================================================
echo Starting the Manas App...
echo ===================================================

echo.
echo [1/3] Starting Python Backend (Flask)...
start "Python Backend" cmd /k "cd /d C:\dev\fyp26\backend && call .venv-backend\Scripts\activate && python app.py"

:: Wait 3 seconds for Python to start loading models
timeout /t 3 /nobreak >nul

echo.
echo [2/3] Starting Node.js Backend...
start "Node Backend" cmd /k "cd /d C:\dev\fyp26\backend && node server.js"

:: Wait 2 seconds for Node to connect to Supabase
timeout /t 2 /nobreak >nul

echo.
echo [3/3] Starting Frontend (Expo)...
start "Expo Frontend" cmd /k "cd /d C:\dev\fyp26 && npm start"

echo.
echo ===================================================
echo All servers are starting in separate windows!
echo You can close this main window now.
echo ===================================================
timeout /t 5 >nul
exit