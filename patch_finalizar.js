const fs = require('fs');

let content = fs.readFileSync('src/server.js', 'utf8');

const regexToFind = /\/\/ NOVA ROTA: Excluir\/Cancelar Ordem de Serviço/;

const newEndpointStr = `
// ---------------------------------------------------------
// NOVA ROTA: Finalizar Ordem Servico (Etapa 6)
// ---------------------------------------------------------
app.post('/api/ordemservico/finalizar', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        const pool = require('../config/db');
        connection = await pool.getConnection();
        const { IdOrdemServico } = req.body;
        
        if (!IdOrdemServico) return res.status(400).json({ success: false, message: 'IdOrdemServico é obrigatório' });

        const [rows] = await connection.query('SELECT OrdemServicoFinalizado FROM ordemservico WHERE IdOrdemServico = ?', [IdOrdemServico]);

        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Ordem de Serviço não encontrada.' });

        if (rows[0].OrdemServicoFinalizado === 'C') {
            return res.status(400).json({ success: false, message: 'O.S. já Finalizada' });
        }

        const dataatual = new Date().toISOString().slice(0, 19).replace('T', ' ');

        // Update ordemservico
        await connection.query(\`
            UPDATE ordemservico 
            SET OrdemServicoFinalizado = 'C',
                DataFinalizado = ?
            WHERE IdOrdemServico = ?
        \`, [dataatual, IdOrdemServico]);

        // Update ordemservicoitem
        await connection.query(\`
            UPDATE ordemservicoitem
            SET OrdemServicoItemFinalizado = 'C'
            WHERE IdOrdemServico = ?
        \`, [IdOrdemServico]);

        return res.json({ success: true, message: 'Processo Finalização Concluído' });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

`;

content = content.replace(regexToFind, newEndpointStr + '// NOVA ROTA: Excluir/Cancelar Ordem de Serviço');

fs.writeFileSync('src/server.js', content, 'utf8');
console.log('Script endpoint finalizar OS appended');
