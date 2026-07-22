const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src', 'server.js');
let content = fs.readFileSync(file, 'utf8');

const marker = `app.get('/api/material/busca-cod', async (req, res) => {`;
const markerIndex = content.indexOf(marker);

if (markerIndex === -1) {
    console.error("Endpoint not found!");
    process.exit(1);
}

// Find the end of it
const nextEndpoint = `// GET ONE (Read Single)`;
const nextIndex = content.indexOf(nextEndpoint, markerIndex);

const newEndpoint = `
// BUSCA LIVRE (Por cÃ³digo ou descriÃ§Ã£o)
app.get('/api/material/busca-livre', async (req, res) => {
    try {
        const search = req.query.q || '';
        const limit = 50;
        
        let sql = \`
            SELECT * FROM material 
            WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
        \`;
        let params = [];
        
        if (search) {
            sql += \` AND (CodMatFabricante LIKE ? OR DescResumo LIKE ? OR DescDetal LIKE ?)\`;
            params = [\`%\${search}%\`, \`%\${search}%\`, \`%\${search}%\`];
        }
        
        sql += \` ORDER BY IdMaterial DESC LIMIT \${limit}\`;
        
        const [rows] = await pool.execute(sql, params);
        res.json({ success: true, data: rows });
    } catch (error) {
        console.error('Error in material search libre:', error);
        res.status(500).json({ success: false, message: 'Erro na busca livre de material' });
    }
});

`;

content = content.slice(0, nextIndex) + newEndpoint + content.slice(nextIndex);

fs.writeFileSync(file, content, 'utf8');
console.log('Endpoint busca-livre adicionado com sucesso!');
