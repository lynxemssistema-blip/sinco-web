@echo off
title SincoWeb — Parar Servidores
echo.
echo  Parando processos SincoWeb via PM2...
echo.
pm2 stop sinco-backend  >nul 2>&1
pm2 stop sinco-frontend >nul 2>&1
pm2 delete sinco-backend  >nul 2>&1
pm2 delete sinco-frontend >nul 2>&1
pm2 save
echo  Processos parados com sucesso.
echo.
pause
