const fs = require('fs');
const path = 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/src/server.js';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `        res.json({ success: true, message: 'Item excluído com sucesso.' });
    } catch (err) {
        console.error('Erro ao excluir item OS:', err);`;

const endStr = `// Static files and SPA Catch-all (Must be last)`;

if (content.indexOf(targetStr) !== -1) {
    const startIdx = content.indexOf(targetStr);
    const endIdx = content.indexOf(endStr, startIdx);
    
    if (endIdx !== -1) {
        const replaceWith = `        res.json({ success: true, message: 'Item excluído com sucesso.' });
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


// Static files and SPA Catch-all (Must be last)`;
        
        const newContent = content.substring(0, startIdx) + replaceWith + content.substring(endIdx + endStr.length);
        fs.writeFileSync(path, newContent, 'utf8');
        console.log('Fixed successfully');
    } else {
        console.log('End string not found');
    }
} else {
    console.log('Target string not found');
}
