@echo off
:loop
echo Starting API Server...
node src/server.js
echo Server exited with %errorlevel%. Restarting in 2 seconds.
timeout /t 2 >nul
goto loop
