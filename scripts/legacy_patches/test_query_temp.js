const mysql = require('mysql2/promise');
require('dotenv').config();
async function run() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST || '192.168.1.189',
        user: process.env.DB_USER || 'sinco',
        password: process.env.DB_PASSWORD || 'Sinco2024*',
        database: process.env.DB_NAME || 'lynxlocal'
    });
    try {
        let whereClause = `oi.EnderecoArquivo <> '' AND oi.EnderecoArquivo IS NOT NULL
            AND (oi.Liberado_Engenharia IS NOT NULL AND oi.Liberado_Engenharia <> '')`;
            
        whereClause += ` AND ((oi.sttxtMontagem IS NULL OR oi.sttxtMontagem = '') AND oi.txtmontagem = '1')
                AND (oi.OrdemServicoItemFinalizado IS NULL OR oi.OrdemServicoItemFinalizado = '')`;

        const query = `
            SELECT
                oi.CodMatFabricante,
                oi.IdOrdemServico,
                oi.IdOrdemServicoItem,
                os.IdProjeto,
                os.Projeto,
                os.IdTag,
                os.Tag,
                os.DescTag,
                os.DescEmpresa,
                oi.Qtdetotal AS QtdeTotal,
                oi.IdPlanoDeCorte,
                oi.DescResumo,
                oi.DescDetal,
                oi.MontagemTotalExecutado,
                oi.MontagemTotalExecutar,
                oi.ProdutoPrincipal,
                oi.RealizadoInicioMontagem,
                oi.RealizadoFinalMontagem,
                oi.Liberado_Engenharia,
                oi.txtmontagem,
                oi.sttxtMontagem,
                oi.OrdemServicoItemFinalizado,
                oi.EnderecoArquivo,
                oi.PesoUnitario
            FROM ordemservicoitem oi
            INNER JOIN ordemservico os ON oi.IdOrdemServico = os.IdOrdemServico
            WHERE ${whereClause}
            LIMIT 500
        `;
        await conn.execute(query);
        console.log('SUCCESS');
    } catch (err) {
        console.error('ERROR:', err.message);
    }
    conn.end();
}
run();
