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
            SELECT IdOrdemServicoItem, Peso, AreaPintura, QtdeTotal 
            FROM ordemservicoitem 
            WHERE IdOrdemServico = 28 AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
        `);
        console.table(rows);
        
        const [sum] = await conn.execute(`
            SELECT COALESCE(SUM(Peso), 0) as SomaPeso, COALESCE(SUM(AreaPintura), 0) as SomaArea 
            FROM ordemservicoitem 
            WHERE IdOrdemServico = 28 AND (D_E_L_E_T_E IS NULL OR D_E_L_E_T_E = '')
        `);
        console.table(sum);
        
    } catch (err) {
        console.log('ERROR:', err.message);
    }
    conn.end();
}
check();
