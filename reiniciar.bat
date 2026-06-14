@echo off
echo [1/2] Reiniciando backend...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 2 /nobreak >nul
start "SINCO-Backend" /D "C:\SincoWeb\SINCO-WEB\SINCO-WEB" powershell -NoExit -Command "node src/server.js 2>&1 | Tee-Object -FilePath backend_run.log"
timeout /t 4 /nobreak >nul
echo [2/2] Reiniciando frontend...
start "SINCO-Frontend" /D "C:\SincoWeb\SINCO-WEB\SINCO-WEB\frontend" powershell -NoExit -Command "npm run dev 2>&1 | Tee-Object -FilePath ..\frontend_dev.log"
echo.
echo Aguarde ~10 segundos e acesse http://localhost:5173
