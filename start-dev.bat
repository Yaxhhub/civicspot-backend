@echo off
echo Starting CivicSpot Development Environment...
echo.

echo Installing dependencies...
cd backend
call npm install
cd ../frontend
call npm install
cd ..

echo.
echo Starting development servers...
start "Backend Server" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak > nul
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo Development servers starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
pause