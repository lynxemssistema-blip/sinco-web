@echo off
echo ===================================================
echo      INICIANDO SINCO-WEB PARA REDE LOCAL
echo ===================================================
echo.
echo 1. Iniciando Backend (Node.js)...
start "Sinco Backend" cmd /k "node src/server.js"

echo 2. Iniciando Frontend (Vite)...
cd frontend
start "Sinco Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ===================================================
echo                 STATUS DO SISTEMA
echo ===================================================
echo.
echo O sistema esta sendo iniciado em janelas separadas.
echo.
echo IMPORTANTE:
echo Se voce ver uma janela do Firewall do Windows, clique em
echo "PERMITIR ACESSO" para redes Privadas e Publicas.
echo.
echo ACESSO LOCAL (Neste computador):
echo   http://localhost:5173
echo.
echo ACESSO NA REDE (Outros computadores/celulares):
echo   http://192.168.1.11:5173
echo.
echo * Se nao funcionar, desative temporariamente o Firewall
echo   para testar.
echo.
pause >nul
