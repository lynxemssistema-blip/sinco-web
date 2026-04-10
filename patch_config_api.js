const fs = require('fs');
const path = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js';
let content = fs.readFileSync(path, 'utf8');

// ---- Patch 1: GET /api/config - add PlanoCorteFiltroDC to SELECT ----
const oldGetConfig = `app.get('/api/config', async (req, res) => {\r\n    try {\r\n        const [rows] = await pool.execute('SELECT RestringirApontamentoSemSaldoAnterior, ProcessosVisiveis FROM configuracaosistema LIMIT 1');\r\n        if (rows.length > 0) {\r\n            res.json({ success: true, config: rows[0] });\r\n        } else {\r\n            // Default config if table empty\r\n            res.json({ success: true, config: { RestringirApontamentoSemSaldoAnterior: 'N\ufffd\ufffdo', ProcessosVisiveis: '[\"corte\",\"dobra\",\"solda\",\"pintura\",\"montagem\"]' } });\r\n        }\r\n    } catch (error) {\r\n        console.error('Config error:', error);\r\n        res.status(500).json({ success: false, message: 'Erro ao buscar configura\ufffd\ufffd\ufffdoes' });\r\n    }\r\n});`;

const newGetConfig = `app.get('/api/config', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT RestringirApontamentoSemSaldoAnterior, ProcessosVisiveis, PlanoCorteFiltroDC FROM configuracaosistema LIMIT 1');
        if (rows.length > 0) {
            res.json({ success: true, config: rows[0] });
        } else {
            res.json({ success: true, config: { RestringirApontamentoSemSaldoAnterior: 'Não', ProcessosVisiveis: '["corte","dobra","solda","pintura","montagem"]', PlanoCorteFiltroDC: 'corte' } });
        }
    } catch (error) {
        console.error('Config error:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar configurações' });
    }
});

// PUT /api/config - Salvar configurações do sistema
app.put('/api/config', async (req, res) => {
    try {
        const { restringirApontamento, processosVisiveis, planoCorteFiltroDC } = req.body;
        
        const [existing] = await pool.execute('SELECT id FROM configuracaosistema LIMIT 1');
        
        if (existing.length > 0) {
            const updates = [];
            const params = [];
            
            if (restringirApontamento !== undefined) {
                updates.push('RestringirApontamentoSemSaldoAnterior = ?');
                params.push(restringirApontamento);
            }
            if (processosVisiveis !== undefined) {
                updates.push('ProcessosVisiveis = ?');
                params.push(processosVisiveis);
            }
            if (planoCorteFiltroDC !== undefined) {
                updates.push('PlanoCorteFiltroDC = ?');
                params.push(planoCorteFiltroDC);
            }
            
            if (updates.length > 0) {
                await pool.execute('UPDATE configuracaosistema SET ' + updates.join(', ') + ' WHERE id = ' + existing[0].id, params);
            }
        } else {
            await pool.execute(
                'INSERT INTO configuracaosistema (RestringirApontamentoSemSaldoAnterior, ProcessosVisiveis, PlanoCorteFiltroDC) VALUES (?, ?, ?)',
                [restringirApontamento || 'Não', processosVisiveis || '["corte","dobra","solda","pintura","montagem"]', planoCorteFiltroDC || 'corte']
            );
        }
        
        res.json({ success: true, message: 'Configurações salvas com sucesso!' });
    } catch (error) {
        console.error('Config save error:', error);
        res.status(500).json({ success: false, message: 'Erro ao salvar configurações' });
    }
});`;

if (content.indexOf(oldGetConfig) !== -1) {
    content = content.replace(oldGetConfig, newGetConfig);
    console.log('Patch 1 (GET+PUT /api/config): applied');
} else {
    // Try LF version
    const oldLF = oldGetConfig.replace(/\r\n/g, '\n');
    if (content.indexOf(oldLF) !== -1) {
        content = content.replace(oldLF, newGetConfig);
        console.log('Patch 1 (LF variant): applied');
    } else {
        // Try marker-based approach
        const marker = `app.get('/api/config', async (req, res) => {`;
        const endMarker = `// GET /api/config/setores`;
        const startIdx = content.indexOf(marker);
        const endIdx = content.indexOf(endMarker, startIdx);
        if (startIdx !== -1 && endIdx !== -1) {
            content = content.substring(0, startIdx) + newGetConfig + '\n\n' + content.substring(endIdx);
            console.log('Patch 1 (marker approach): applied');
        } else {
            console.log('Patch 1: FAILED - could not find target. startIdx=' + startIdx + ' endIdx=' + endIdx);
        }
    }
}

// ---- Patch 2: Update GET /api/plano-corte/itens-disponiveis to read from DB config ----
const oldPlanoCorteEndpoint = `app.get('/api/plano-corte/itens-disponiveis', async (req, res) => {
    let connection = null;
    try {
        const { tipoFiltro } = req.query; // 'corte' ou 'chaparia'`;

const newPlanoCorteEndpoint = `app.get('/api/plano-corte/itens-disponiveis', async (req, res) => {
    let connection = null;
    try {
        // Read filter type from DB config (ignores query param - controlled by admin)
        let tipoFiltro = req.query.tipoFiltro; // still allow override for admin use
        if (!tipoFiltro) {
            try {
                const [cfgRows] = await pool.execute('SELECT PlanoCorteFiltroDC FROM configuracaosistema LIMIT 1');
                tipoFiltro = (cfgRows.length > 0 && cfgRows[0].PlanoCorteFiltroDC) ? cfgRows[0].PlanoCorteFiltroDC : 'corte';
            } catch (_) { tipoFiltro = 'corte'; }
        }`;

if (content.indexOf(oldPlanoCorteEndpoint) !== -1) {
    content = content.replace(oldPlanoCorteEndpoint, newPlanoCorteEndpoint);
    console.log('Patch 2 (plano-corte endpoint): applied');
} else {
    console.log('Patch 2: trying CRLF variant...');
    const oldCRLF = oldPlanoCorteEndpoint.split('\n').join('\r\n');
    if (content.indexOf(oldCRLF) !== -1) {
        content = content.replace(oldCRLF, newPlanoCorteEndpoint);
        console.log('Patch 2 (CRLF): applied');
    } else {
        console.log('Patch 2: FAILED - marker not found');
    }
}

fs.writeFileSync(path, content, 'utf8');
console.log('server.js patches written.');
