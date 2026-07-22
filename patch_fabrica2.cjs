const fs = require('fs');
const file = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js';
let content = fs.readFileSync(file, 'utf8');

const regex = /app\.put\('\/api\/recursos\/:id', tenantMiddleware, async \(req, res\) => \{\s*const \{ id \} = req\.params;\s*const \{ processofabricacao, CodigoProcessoFabricacao, Fabrica, DataLiberada, Setup, TempoPadrao \} = req\.body;\s*try \{/;

const insertStr = 
        // --- NEW VALIDATION ---
        const [oldRows] = await req.tenantDbPool.execute('SELECT processofabricacao, Fabrica FROM processofabricacao WHERE IdProcessoFabricacao = ?', [id]);
        if (oldRows.length > 0) {
            const oldProc = oldRows[0];
            const oldFabrica = oldProc.Fabrica || 'NAO';
            const newFabrica = Fabrica || 'NAO';
            
            if (oldFabrica !== newFabrica) {
                const procNameFormatado = (oldProc.processofabricacao || '').trim().replace(/\\s+/g, '');
                if (procNameFormatado) {
                    const colName = \	xt\\;
                    const [cols] = await req.tenantDbPool.execute(\SHOW COLUMNS FROM ordemservicoitem LIKE ?\, [colName]);
                    if (cols.length > 0) {
                        const [usage] = await req.tenantDbPool.execute(\SELECT 1 FROM ordemservicoitem WHERE \\\\\\\ = '1' LIMIT 1\);
                        if (usage.length > 0) {
                            return res.status(400).json({ success: false, message: 'Não é possível alterar o campo Fabrica porque este processo já está montado em um item de Ordem de Serviço.' });
                        }
                    }
                }
            }
        }
        // --- END VALIDATION ---
;

if (regex.test(content) && !content.includes('// --- NEW VALIDATION ---')) {
    content = content.replace(regex, match => match + insertStr);
    fs.writeFileSync(file, content);
    console.log('Successfully patched server.js with validation logic');
} else {
    console.log('Target string not found or already patched.');
}
