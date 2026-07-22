require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });
    
    try {
        const [rows] = await conn.execute(`
            SELECT 
                IdOrdemServicoItem, IdOrdemServico, DescResumo, DescDetal, Fator,
                QtdeTotal, Peso, AreaPintura, Acabamento, Unidade,
                Espessura, Altura, Largura,
                CodMatFabricante, MaterialSW, EnderecoArquivo,
                ProdutoPrincipal,
                OrdemServicoItemFinalizado as Finalizado,
                txtCorte, sttxtCorte, CortePercentual,
                txtDobra, sttxtDobra, DobraPercentual,
                txtSolda, sttxtSolda, SoldaPercentual,
                txtPintura, sttxtPintura, PinturaPercentual,
                TxtMontagem, sttxtMontagem, MontagemPercentual
            FROM ordemservicoitem 
            WHERE IdOrdemServico = 28 AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
            ORDER BY IdOrdemServicoItem
        `);
        console.log('Result:', rows);
    } catch (err) {
        console.log('ERROR:', err.message);
    }
    conn.end();
}
check();
