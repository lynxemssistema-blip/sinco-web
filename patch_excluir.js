const fs = require('fs');

let content = fs.readFileSync('src/server.js', 'utf8');

const regexToFind = /\/\/ NOVA ROTA: Atualizar arquivos na pasta da OS \(Icone 3\)/;

const newEndpointStr = `
// ---------------------------------------------------------
// NOVA ROTA: Excluir/Cancelar Ordem de Serviço
// ---------------------------------------------------------
app.post('/api/ordemservico/excluir', tenantMiddleware, async (req, res) => {
    let connection;
    try {
        const pool = require('../config/db');
        connection = await pool.getConnection();
        const { IdOrdemServico, Usuario } = req.body;
        
        if (!IdOrdemServico) return res.status(400).json({ success: false, message: 'IdOrdemServico é obrigatório' });

        // Validação idêntica ao VB.NET: verificar se há execução ou plano de corte
        const [rows] = await connection.query(\`
            SELECT 
                count(idplanodecorte) +
                count(CorteTotalExecutado) + count(DobraTotalExecutado) + count(SoldaTotalExecutado) +
                count(PinturaTotalExecutado) + count(MontagemTotalExecutado) as totalExecutado
            FROM ordemservicoitem 
            WHERE IdOrdemServico = ? 
              AND (idplanodecorte > 0 OR CorteTotalExecutado > 0 OR DobraTotalExecutado > 0 OR SoldaTotalExecutado > 0 OR PinturaTotalExecutado > 0 OR MontagemTotalExecutado > 0)
              AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
        \`, [IdOrdemServico]);

        let totalExecutado = 0;
        if (rows.length > 0) {
            totalExecutado = parseInt(rows[0].totalExecutado) || 0;
        }

        if (totalExecutado > 0) {
            // Busca apenas os planos de corte para listar na mensagem, caso haja para exibição de detalhes
            const [planoRows] = await connection.query(\`
                SELECT idplanodecorte, CodMatFabricante
                FROM ordemservicoitem 
                WHERE IdOrdemServico = ? AND idplanodecorte > 0 AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            \`, [IdOrdemServico]);

            let MsgDetalhes = '';
            for (const p of planoRows) {
                MsgDetalhes += \`\\nPlanoCorte = \${p.idplanodecorte}  Numero Desenho: = \${p.CodMatFabricante}\`;
            }

            return res.status(400).json({
                success: false, 
                message: \`A OS Numero: \${IdOrdemServico} contém processos em andamento, por este motivo não pode ser cancelada. Ver plano(s) de corte:\${MsgDetalhes}\`
            });
        }

        // Realiza o "Soft Delete" na tabela ordemservico
        const dataatual = new Date().toISOString().slice(0, 19).replace('T', ' '); // Formato: YYYY-MM-DD HH:mm:ss
        const executor = Usuario || 'Sistema'; // Fallback

        const [updateOS] = await connection.query(\`
            UPDATE ordemservico 
            SET D_E_L_E_T_E = '*', Usuáriod_e_l_e_t_e = ?, DataD_E_L_E_T_E = ?
            WHERE IdOrdemServico = ?
        \`, [executor, dataatual, IdOrdemServico]);

        if (updateOS.affectedRows === 0) {
            return res.status(400).json({ success: false, message: 'Ordem de Serviço não encontrada ou já excluída.' });
        }

        // Realiza o "Soft Delete" na tabela ordemservicoitem
        await connection.query(\`
            UPDATE ordemservicoitem
            SET D_E_L_E_T_E = '*', Usuáriod_e_l_e_t_e = ?, DataD_E_L_E_T_E = ?
            WHERE IdOrdemServico = ?
        \`, [executor, dataatual, IdOrdemServico]);

        // Aqui entraria: ClasseclOrdemServico.CalcularordemservicoitemFatorOS_TAG_PROJETO() 
        // Em um ecosistema reativo moderno ou onde essa query roda, precisariamos recalcular nivel superior.
        // Como o React recarrega a grid com dados do SQL, o \`D_E_L_E_T_E = '*'\` ja omitira da listagem inicial.

        return res.json({ success: true, message: 'Ordem de serviço excluída com sucesso.' });

    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, message: e.message });
    } finally {
        if (connection) connection.release();
    }
});

`;

content = content.replace(regexToFind, newEndpointStr + '// NOVA ROTA: Atualizar arquivos na pasta da OS (Icone 3)');

fs.writeFileSync('src/server.js', content, 'utf8');
console.log('Script endpoint excluding OS appended');
