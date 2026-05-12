@echo off
title SINCO-WEB PRODUCAO - alfatecsinco.lynxems.com.br
echo Iniciando Servidor de Producao...
cd /d "C:\SincoWeb\SINCO-WEB\SINCO-WEB\PublicaçãoSite"
pm2 delete sinco-web-prod
pm2 start ecosystem.config.js
pm2 save
echo.
echo Servidor iniciado com sucesso!
echo Dominio: http://alfatecsinco.lynxems.com.br
echo Porta: 3000
pause
