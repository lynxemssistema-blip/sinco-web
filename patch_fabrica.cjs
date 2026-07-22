const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js';
let content = fs.readFileSync(file, 'utf8');

const targetStr = `app.put('/api/recursos/:id', tenantMiddleware, async (req, res) => {
    const { id } = req.params;
    const { processofabricacao, CodigoProcessoFabricacao, Fabrica, DataLiberada, Setup, TempoPadrao } = req.body;
    try {`;

const insertStr = `
        // --- NEW VALIDATION ---
        const [oldRows] = await req.tenantDbPool.execute('SELECT processofabricacao, Fabrica FROM processofabricacao WHERE IdProcessoFabricacao = ?', [id]);
        if (oldRows.length > 0) {
            const oldProc = oldRows[0];
            const oldFabrica = oldProc.Fabrica || 'NAO';
            const newFabrica = Fabrica || 'NAO';
            
            if (oldFabrica !== newFabrica) {
                const procNameFormatado = (oldProc.processofabricacao || '').trim().replace(/\\s+/g, '');
                if (procNameFormatado) {
                    const colName = \`txt\${procNameFormatado}\`;
                    const [cols] = await req.tenantDbPool.execute(\`SHOW COLUMNS FROM ordemservicoitem LIKE ?\`, [colName]);
                    if (cols.length > 0) {
                        const [usage] = await req.tenantDbPool.execute(\`SELECT 1 FROM ordemservicoitem WHERE \\\`\${colName}\\\` = '1' LIMIT 1\`);
                        if (usage.length > 0) {
                            return res.status(400).json({ success: false, message: 'Não é possível alterar o campo Fabrica porque este processo já está montado em um item de Ordem de Serviço.' });
                        }
                    }
                }
            }
        }
        // --- END VALIDATION ---
`;

if (content.includes(targetStr) && !content.includes('// --- NEW VALIDATION ---')) {
    content = content.replace(targetStr, targetStr + insertStr);
    fs.writeFileSync(file, content);
    console.log('Successfully patched server.js with validation logic');
} else {
    console.log('Target string not found or already patched.');
}
