const fs = require('fs');
const filePath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
    "app.get('/api/ordemservicoitem/check-file', authenticateToken, tenantMiddleware, (req, res) => {",
    "app.get('/api/ordemservicoitem/check-file', (req, res) => {"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed server.js check-file');
