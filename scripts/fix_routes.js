const fs = require('fs');
let file = fs.readFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js', 'utf8');
const target = "app.get('/api/ordemservico/busca-item', async (req, res) => {";
const replacement = `
// OPTIONS: Lista de Projetos para Clonagem
app.get('/api/ordemservico/projetos-clonagem', async (req, res) => {
    try {
        const [rows] = await pool.execute("SELECT IdProjeto as value, Projeto as label FROM projetos WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') ORDER BY Projeto");
        res.json({ success: true, data: rows });
    } catch (error) { res.status(500).json({ success: false }); }
});

// OPTIONS: Lista de Tags para Clonagem
app.get('/api/ordemservico/tags-clonagem', async (req, res) => {
    try {
        const projetoId = req.query.projetoId;
        if (!projetoId) return res.json({ success: true, data: [] });
        const [rows] = await pool.execute("SELECT IdTag as value, Tag as label FROM tags WHERE (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '') AND IdProjeto = ? ORDER BY Tag", [projetoId]);
        res.json({ success: true, data: rows });
    } catch (error) { res.status(500).json({ success: false }); }
});

` + target;
if(file.includes(target) && !file.includes('projetos-clonagem')) {
    file = file.replace(target, replacement);
    fs.writeFileSync('c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js', file);
    console.log("Success");
} else {
    console.log("Target not found or already replaced");
}
