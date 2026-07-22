const fs = require('fs');

// 1. vite.config.ts proxy
let vitePath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/frontend/vite.config.ts';
let viteContent = fs.readFileSync(vitePath, 'utf8');

if (!viteContent.includes("'/fotosfuncionarios': {")) {
    viteContent = viteContent.replace(
        /\/uploads': \{/,
        "'/fotosfuncionarios': {\n        target: 'http://127.0.0.1:3000',\n        changeOrigin: true,\n        secure: false,\n      },\n      '/uploads': {"
    );
    fs.writeFileSync(vitePath, viteContent);
    console.log('vite.config.ts patched.');
}

// 2. server.js dynamic route
let serverPath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js';
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Remove static /fotosfuncionarios
let staticRouteRegex = /app\.use\('\/fotosfuncionarios', express\.static\([^)]+\)\);/;
if (staticRouteRegex.test(serverContent)) {
    serverContent = serverContent.replace(staticRouteRegex, '');
    
    // Add dynamic route
    let dynamicRoute = `
// Rota dinâmica para fotos de funcionários (CNH) baseada no tenant
app.get('/fotosfuncionarios/:filename', tenantMiddleware, async (req, res) => {
    let baseDir = 'C:\\\\fotosfuncionarios';
    try {
        if (req.tenantDbPool) {
            const [rows] = await req.tenantDbPool.execute('SELECT EnderecoSalvarCNHMotorista FROM configuracaosistema LIMIT 1');
            if (rows.length > 0 && rows[0].EnderecoSalvarCNHMotorista) {
                baseDir = rows[0].EnderecoSalvarCNHMotorista;
            }
        }
    } catch (e) {
        console.error('Erro ao buscar diretório da CNH para servir:', e);
    }
    const filepath = require('path').join(baseDir, req.params.filename);
    if (require('fs').existsSync(filepath)) {
        res.sendFile(filepath);
    } else {
        res.status(404).send('Arquivo não encontrado');
    }
});
`;
    // Insert after uploads static route
    serverContent = serverContent.replace(
        /app\.use\('\/uploads', express\.static[^\n]+/,
        "$&" + dynamicRoute
    );
    fs.writeFileSync(serverPath, serverContent);
    console.log('server.js patched.');
}

