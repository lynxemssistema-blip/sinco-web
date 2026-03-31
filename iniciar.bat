@echo off
title SincoWeb — Gerenciador PM2
echo.
echo  =========================================
echo    SincoWeb — Inicializacao com PM2
echo  =========================================
echo.

:: Verifica se pm2 esta disponivel
pm2 --version >nul 2>&1
if errorlevel 1 (
    echo [ERRO] PM2 nao encontrado. Instalando globalmente...
    npm install -g pm2
    if errorlevel 1 (
        echo [ERRO] Falha ao instalar PM2. Verifique sua instalacao do Node.js.
        pause
        exit /b 1
    )
)

:: Para qualquer instancia anterior do SincoWeb
echo [1/3] Parando instancias anteriores...
pm2 delete sinco-backend  >nul 2>&1
pm2 delete sinco-frontend >nul 2>&1

:: Cria pasta de logs se nao existir
if not exist "logs" mkdir logs

:: Inicia com o ecosystem config (backend + frontend com autorestart)
echo [2/3] Iniciando Backend e Frontend via PM2...
pm2 start ecosystem.config.js

:: Aguarda 3s para garantir inicializacao
timeout /t 3 /nobreak >nul

:: Salva o estado do PM2 (recover apos reboot se configurado)
pm2 save

echo.
echo [3/3] Status dos processos:
pm2 list

echo.
echo  =========================================
echo    App rodando com PM2 (restart automatico)
echo    Backend:  http://localhost:3000
echo    Frontend: http://localhost:5173
echo.
echo    Comandos uteis:
echo      pm2 logs           - Ver logs em tempo real
echo      pm2 list           - Status dos processos
echo      pm2 restart all    - Reiniciar tudo
echo      pm2 stop all       - Parar tudo
echo      pm2 monit          - Monitor grafico
echo  =========================================
echo.
pause
