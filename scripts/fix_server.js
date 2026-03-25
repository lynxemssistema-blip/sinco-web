const fs = require('fs');
const filePath = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
    "app.delete('/api/ordemservicoitem/:id', authenticateToken, tenantMiddleware, async (req, res) => {",
    "app.delete('/api/ordemservicoitem/:id', async (req, res) => {"
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed server.js');
