// Test the exact query that _handlePlanoItens would run for plan 2
const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: Number(process.env.DB_PORT) || 3306
    });

    try {
        // Simple query first
        console.log('=== Simple query ===');
        const [simple] = await pool.execute(
            `SELECT IdOrdemServicoItem, idplanodecorte, txtCorte, sttxtCorte 
             FROM ordemservicoitem 
             WHERE idplanodecorte = '2' 
               AND (d_e_l_e_t_e IS NULL OR d_e_l_e_t_e = '')
               AND (txtCorte = '1' AND (sttxtCorte IS NULL OR sttxtCorte = ''))
               AND (ordemservicoitemfinalizado IS NULL OR ordemservicoitemfinalizado = '')`
        );
        console.log('Results:', simple.length);
        simple.forEach(r => console.log(' ', JSON.stringify(r)));

        // Full query with all columns
        console.log('\n=== Full query with all columns ===');
        try {
            const [full] = await pool.execute(`
                SELECT
                    CodMatFabricante, idplanodecorte AS IdPlanodecorte,
                    IdOrdemServico, IdOrdemServicoItem, Espessura, MaterialSW,
                    IdProjeto, Projeto, IdTag, Tag, Acabamento, txtSoldagem, ProdutoPrincipal,
                    QtdeTotal, txtCorte,
                    COALESCE(NULLIF(CorteTotalExecutado, ''), 0) AS CorteTotalExecutado,
                    COALESCE(NULLIF(CorteTotalExecutar,  ''), 0) AS CorteTotalExecutar,
                    CONCAT(COALESCE(NULLIF(CorteTotalExecutado,''),0), '\\\\', QtdeTotal) AS Parcial,
                    OrdemServicoItemFinalizado, DescResumo, DescDetal,
                    UPPER(REPLACE(EnderecoArquivo, '##', '\\\\\\\\')) AS EnderecoArquivo,
                    UPPER(REPLACE(COALESCE(EnderecoArquivoItemOrdemServico,''), '##', '\\\\\\\\')) AS EnderecoArquivoItemOrdemServico,
                    qtde, txtDobra, txtSolda, txtPintura, txtMontagem, sttxtCorte,
                    RealizadoInicioCorte, RealizadoFinalCorte, Liberado_Engenharia
                FROM ordemservicoitem
                WHERE (d_e_l_e_t_e IS NULL OR d_e_l_e_t_e = '')
                  AND idplanodecorte = '2'
                  AND (txtCorte = '1' AND (sttxtCorte IS NULL OR sttxtCorte = ''))
                  AND (ordemservicoitemfinalizado IS NULL OR ordemservicoitemfinalizado = '')
                ORDER BY IdOrdemServicoItem ASC
            `);
            console.log('Results:', full.length);
            if (full.length > 0) {
                console.log('First item:', JSON.stringify(full[0], null, 2));
            }
        } catch (sqlErr) {
            console.log('SQL ERROR:', sqlErr.message);
            console.log('SQL Code:', sqlErr.code);
        }

    } finally {
        await pool.end();
    }
}
main().catch(console.error);
