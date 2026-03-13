@echo off
echo ===================================================
echo      SINCO-WEB  -  Iniciando Servicos
echo ===================================================
echo.

:: ─── Encerrar processos anteriores (porta 3000 e 5173) ─────────────────────
echo [1/4] Encerrando processos antigos...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo    Encerrando PID %%a na porta 3000...
    taskkill /PID %%a /F >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " ^| findstr "LISTENING"') do (
    echo    Encerrando PID %%a na porta 5173...
    taskkill /PID %%a /F >nul 2>&1
)

:: ─── Aguardar liberacao das portas ─────────────────────────────────────────
timeout /t 2 /nobreak >nul

:: ─── Iniciar Backend ────────────────────────────────────────────────────────
echo [2/4] Iniciando Backend (Node.js - porta 3000)...
start "Sinco Backend" cmd /k "cd /d c:\SincoWeb\SINCO-WEB\SINCO-WEB && node src/server.js"

:: ─── Aguardar backend subir ─────────────────────────────────────────────────
timeout /t 3 /nobreak >nul

:: ─── Iniciar Frontend ───────────────────────────────────────────────────────
echo [3/4] Iniciando Frontend (Vite - porta 5173)...
start "Sinco Frontend" cmd /k "cd /d c:\SincoWeb\SINCO-WEB\SINCO-WEB\frontend && npm run dev"

:: ─── Aguardar frontend compilar ─────────────────────────────────────────────
timeout /t 4 /nobreak >nul

:: ─── Info ────────────────────────────────────────────────────────────────────
echo [4/4] Servicos iniciados!
echo.
echo ===================================================
echo                  URLs DE ACESSO
echo ===================================================
echo.
echo   Local (este PC):    http://localhost:5173
echo   Rede local:         http://192.168.1.11:5173
echo.
echo ===================================================
echo  IMPORTANTE: Se aparecer janela do Firewall do
echo  Windows, clique em "Permitir Acesso".
echo ===================================================
echo.
echo Pressione qualquer tecla npara fechar esta janela.
echo (Os servidores continuarao rodando nas janelas abertas)
echo.
pause >nul