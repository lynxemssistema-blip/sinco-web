const fs = require('fs');

let content = fs.readFileSync('src/server.js', 'utf8');

const regexToFind = /\/\/ ---------------------------------------------------------/;

const novaRota = `
// ---------------------------------------------------------
// NOVA ROTA: Cancelar Finalizacao Ordem Servico (Etapa 7)
// ---------------------------------------------------------
app.post('/api/ordemservico/cancelar-finalizacao', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const { IdOrdemServico } = req.body;
        
        if (!IdOrdemServico) return res.status(400).json({ success: false, message: 'IdOrdemServico é obrigatório' });

        const [rows] = await connection.query('SELECT OrdemServicoFinalizado FROM ordemservico WHERE IdOrdemServico = ?', [IdOrdemServico]);

        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Ordem de Serviço não encontrada.' });

        if (rows[0].OrdemServicoFinalizado !== 'C') {
            return res.status(400).json({ success: false, message: 'Não Há itens para continuar processo (OS não finalizada).' });
        }

        try {
            await connection.query('UPDATE planocorte SET Concluido = "" WHERE IdOrdemServico = ?', [IdOrdemServico]);
        } catch(e) {
            console.log("Aviso: tabela planocorte possivelmente ignorada/vazia para UPDATE:", e.message);
        }

        await connection.query('UPDATE ordemservico SET ORDEMSERVICOFINALIZADO = "", DataFinalizado = NULL WHERE IdOrdemServico = ?', [IdOrdemServico]);
        
        await connection.query('UPDATE ordemservicoitem SET ORDEMSERVICOITEMFINALIZADO = "" WHERE IdOrdemServico = ?', [IdOrdemServico]);

        return res.json({ success: true, message: 'Processo de cancelamento da Finalização Executado' });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

`;

content = content.replace(regexToFind, novaRota + '// ---------------------------------------------------------');

fs.writeFileSync('src/server.js', content, 'utf8');
console.log('Script endpoint cancelar-finalizacao OS appended');
