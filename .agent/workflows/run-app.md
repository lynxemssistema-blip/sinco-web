---
description: Executa o app SINCO-WEB moderno (React/Vite)
---

# Executar o App Moderno

## 1. Iniciar o Backend (API)
// turbo
```bash
cd c:\Users\edson\Desktop\SINCO-WEB
cmd /c "node src/server.js"
```
- Porta: **3000**
- Conecta ao banco MySQL

## 2. Iniciar o Frontend (React/Vite)
// turbo
```bash
cd c:\Users\edson\Desktop\SINCO-WEB\frontend
cmd /c "npm run dev"
```
- Porta: **5173**
- Acesse em: http://localhost:5173

## Notas
- O frontend moderno está em `frontend/` (React + Vite + TailwindCSS)
- As páginas estáticas antigas em `public/` não são mais usadas como padrão
