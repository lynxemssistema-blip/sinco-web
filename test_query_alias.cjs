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
            SELECT
                IdTag, Tag, DescTag, DataEntrada, DataPrevisao, QtdeTag, QtdeLiberada, SaldoTag, ValorTag, StatusTag,
                (SELECT COUNT(*) FROM ordemservico os WHERE os.IdTag = tags.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')) AS QtdeOS,
                QtdeOSExecutadas, QtdePecasOS, QtdePecasExecutadas, PercentualPecas, PercentualOS
            FROM tags
            WHERE IdTag = 236
        `);
        console.log("Result:", rows[0]);
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
test();
