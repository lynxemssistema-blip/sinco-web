require('dotenv').config();
const mysql = require('mysql2/promise');

async function test() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
    });
    
    try {
        const [rows] = await pool.query(`
            SELECT IdOrdemServico, OrdemServicoFinalizado
            FROM ordemservico
            WHERE IdOrdemServico IN (26, 27, 28, 29, 31)
        `);
        console.log("OS Status:", rows);
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
test();
