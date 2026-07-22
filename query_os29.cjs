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
    
    console.log("=== ORDEM SERVICO 29 ===");
    const [os] = await conn.execute(`SELECT IdOrdemServico, QtdeTotalItens, PesoTotal, AreaPinturaTotal FROM ordemservico WHERE IdOrdemServico = 29`);
    console.table(os);
    
    console.log("\n=== ITENS DA OS 29 ===");
    const [itens] = await conn.execute(`SELECT IdOrdemServicoItem, QtdeTotal, Peso, AreaPintura, PesoUnitario, AreaPinturaUnitario, EnderecoArquivo FROM ordemservicoitem WHERE IdOrdemServico = 29`);
    console.table(itens);
    
    // Test the recalculation logic
    console.log("\n=== TESTANDO RECALCULO ===");
    const [updateOsResult] = await conn.execute(`
            UPDATE ordemservico os
            SET 
                QtdeTotalItens = (SELECT COALESCE(SUM(oi.QtdeTotal), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                PesoTotal = (SELECT COALESCE(SUM(oi.Peso), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')),
                AreaPinturaTotal = (SELECT COALESCE(SUM(oi.AreaPintura), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = ''))
            WHERE os.IdOrdemServico = 29
    `);
    console.log('Update result:', updateOsResult.info);
    
    const [osAfter] = await conn.execute(`SELECT IdOrdemServico, QtdeTotalItens, PesoTotal, AreaPinturaTotal FROM ordemservico WHERE IdOrdemServico = 29`);
    console.table(osAfter);
    
    conn.end();
}
check().catch(console.error);
