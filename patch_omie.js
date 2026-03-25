const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, 'src/server.js');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add NumeroOPOmie to GET /api/ordemservico
const getSelectTarget = `PlanejadoInicioACABAMENTO, PlanejadoFinalACABAMENTO, RealizadoInicioACABAMENTO, RealizadoFinalACABAMENTO,
                EnderecoOrdemServico
            FROM ordemservico `;
const getSelectReplacement = `PlanejadoInicioACABAMENTO, PlanejadoFinalACABAMENTO, RealizadoInicioACABAMENTO, RealizadoFinalACABAMENTO,
                EnderecoOrdemServico, NumeroOPOmie
            FROM ordemservico `;

if (content.includes(getSelectTarget)) {
    content = content.replace(getSelectTarget, getSelectReplacement);
    console.log("Injected NumeroOPOmie into GET /api/ordemservico SELECT.");
} else {
    // try exact match fallback
    const fallbackTarget = "EnderecoOrdemServico\n            FROM ordemservico";
    if (content.includes(fallbackTarget)) {
        content = content.replace(fallbackTarget, "EnderecoOrdemServico, NumeroOPOmie\n            FROM ordemservico");
        console.log("Injected NumeroOPOmie via fallback.");
    } else {
        console.error("Could not find GET /api/ordemservico SELECT to inject NumeroOPOmie.");
    }
}

// 2. Add NumeroOPOmie to GET /api/ordemservico/:id
// wait, that one uses 'SELECT * FROM ordemservico', which naturally includes it! So no change needed.

// 3. Inject POST /api/ordemservico/numero-op
const routeCode = `
// ---------------------------------------------------------
// NOVA ROTA: Inserir Numero OP do Omie (Etapa 8)
// ---------------------------------------------------------
app.post('/api/ordemservico/numero-op', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { IdOrdemServico, NumeroOPOmie } = req.body;
        
        if (!IdOrdemServico) return res.status(400).json({ success: false, message: 'IdOrdemServico é obrigatório' });

        await connection.query('UPDATE ordemservico SET NumeroOPOmie = ? WHERE IdOrdemServico = ?', [NumeroOPOmie || '', IdOrdemServico]);
        
        await connection.query('UPDATE ordemservicoitem SET NumeroOpOmie = ? WHERE IdOrdemServico = ?', [NumeroOPOmie || '', IdOrdemServico]);

        return res.json({ success: true, message: 'Número da OP do OMIE atualizado com sucesso!' });

    } catch (e) {
        console.error("Erro ao atualizar Numero OP Omie:", e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});
`;
const anchor = "app.post('/api/ordemservico/excluir'";
if (!content.includes('/api/ordemservico/numero-op')) {
    if (content.includes(anchor)) {
        content = content.replace(anchor, routeCode + "\n" + anchor);
        console.log("Injected POST /api/ordemservico/numero-op route successfully.");
    } else {
        console.error("Could not find anchor to inject the new route!");
    }
} else {
    console.log("The POST route for numero-op already exists.");
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log("Patch complete.");
