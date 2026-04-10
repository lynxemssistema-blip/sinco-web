const fs = require('fs');
const path = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js';
let content = fs.readFileSync(path, 'utf8');

const startMarker = `// --- Ícone 5: Excluir linha OS ---`;
const endMarker = `// Static files and SPA Catch-all (Must be last)`;

if (content.indexOf(startMarker) !== -1 && content.indexOf(endMarker) !== -1) {
    const startIdx = content.indexOf(startMarker);
    const endIdx = content.indexOf(endMarker);
    
    if (startIdx < endIdx) {
        const replacement = `// --- Ícone 5: Excluir linha OS ---
app.delete('/api/ordemservicoitem/:id', async (req, res) => {
    let connection = null;
    try {
        const id = req.params.id;
        connection = await (req.tenantDbPool || pool).getConnection();
        
        const [rows] = await connection.execute("SELECT Liberado_Engenharia FROM ordemservicoitem WHERE IdOrdemServicoItem = ?", [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Item não encontrado.' });
        
        if (rows[0].Liberado_Engenharia === 'S' || rows[0].Liberado_Engenharia === 'SIM') {
            return res.status(400).json({ success: false, message: 'Item da Ordem Serviço não pode ser excluido, O.S. já liberada! Verifique!' });
        }
        
        const usuarioDesc = req.user?.nome || 'Sistema';
        
        const [updateRes] = await connection.execute(
            \`UPDATE ordemservicoitem 
             SET d_e_l_e_t_e = '*', Usuáriod_e_l_e_t_e = ?, datad_e_l_e_t_e = NOW() 
             WHERE IdOrdemServicoItem = ?\`,
            [usuarioDesc, id]
        );
        
        if (updateRes.affectedRows === 0) {
            return res.status(400).json({ success: false, message: 'Item não excluído, verifique.' });
        }
        
        res.json({ success: true, message: 'Item excluído com sucesso.' });
    } catch (err) {
        console.error('Erro ao excluir item OS:', err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// ============================================================================
// PLANO DE CORTE
// ============================================================================
app.get('/api/plano-corte/itens-disponiveis', async (req, res) => {
    let connection = null;
    try {
        const { tipoFiltro } = req.query; // 'corte' ou 'chaparia'
        
        connection = await (req.tenantDbPool || pool).getConnection();
        
        let query = \`
            SELECT 
                CodMatFabricante,
                Espessura,
                MaterialSW,
                IdEmpresa,
                DescEmpresa,
                IdProjeto,
                IdTag,
                QtdeTotal,
                IdOrdemServico,
                IdOrdemServicoItem,
                IdPlanoDeCorte,
                Projeto,
                Tag,
                EnderecoArquivo,
                DescTag,
                DescResumo,
                DescDetal
            FROM viewordemservicoitem
            WHERE 
                (EnderecoArquivo LIKE '%SLDPRT%' OR EnderecoArquivo LIKE '%PSM%' OR EnderecoArquivo LIKE '%PAR%') 
                AND (Espessura IS NOT NULL AND Espessura <> '')
                AND (MaterialSW IS NOT NULL AND MaterialSW <> '')
                AND (OrdemServicoItemFinalizado IS NULL OR OrdemServicoItemFinalizado = '')
                AND (SttxtCorte IS NULL OR SttxtCorte = '')
                AND (IdPlanoDeCorte IS NULL OR IdPlanoDeCorte = '')
                AND Liberado_Engenharia = 'S'
        \`;
        
        const params = [];
        
        if (tipoFiltro === 'corte') {
            query += " AND TxtCorte = '1'";
        } else if (tipoFiltro === 'chaparia') {
            query += " AND TxtTipoDesenho = 'CHAPARIA'";
        }

        query += " ORDER BY Projeto ASC, Tag ASC LIMIT 1000";

        const [rows] = await connection.execute(query, params);
        
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('Erro ao buscar itens de plano de corte:', err);
        res.status(500).json({ success: false, message: 'Erro interno ao buscar itens' });
    } finally {
        if (connection) connection.release();
    }
});

`;
        const newContent = content.substring(0, startIdx) + replacement + content.substring(endIdx);
        fs.writeFileSync(path, newContent, 'utf8');
        console.log('Fixed successfully');
    } else {
        console.log('Markers out of order');
    }
} else {
    console.log('Markers not found');
}
