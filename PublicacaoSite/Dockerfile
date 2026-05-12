FROM node:20-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json* ./

# Instalar dependências de produção
RUN npm install --omit=dev

# Copiar código fonte do backend
COPY src/ ./src/
COPY public/ ./public/

# Copiar o frontend já buildado (arquivos estáticos)
COPY index.html ./index.html
COPY landing.html ./landing.html
COPY assets/ ./assets/
COPY manifest.webmanifest ./manifest.webmanifest
COPY registerSW.js ./registerSW.js
COPY sw.js ./sw.js
COPY workbox-*.js ./
COPY *.png ./
COPY *.svg ./
COPY login_inicial.html ./login_inicial.html
COPY .env ./.env

# Expor porta
EXPOSE 3000

# Iniciar aplicação
CMD ["node", "src/server.js"]
