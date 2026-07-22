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
        const [sum] = await conn.execute(`
            SELECT COALESCE(SUM(oi.QtdeTotal), 0) as Qtde
            FROM ordemservicoitem oi 
            WHERE oi.IdOrdemServico = 28 AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = '')
        `);
        console.log('SUM:', sum);

        const [os] = await conn.execute(`SELECT IdOrdemServico, QtdeTotalItens FROM ordemservico WHERE IdOrdemServico = 28`);
        console.log('OS 28:', os);
        
        await conn.execute(`
            UPDATE ordemservico os
            SET 
                QtdeTotalItens = (SELECT COALESCE(SUM(oi.QtdeTotal), 0) FROM ordemservicoitem oi WHERE oi.IdOrdemServico = os.IdOrdemServico AND (oi.d_e_l_e_t_e IS NULL OR oi.d_e_l_e_t_e = ''))
            WHERE os.IdOrdemServico = 28
        `);
        
        const [osAfter] = await conn.execute(`SELECT IdOrdemServico, QtdeTotalItens FROM ordemservico WHERE IdOrdemServico = 28`);
        console.log('OS 28 after UPDATE:', osAfter);

    } catch (err) {
        console.log('ERROR:', err.message);
    }
    conn.end();
}
check();
