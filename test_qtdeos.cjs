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
        const [tags] = await pool.query(`
            SELECT IdTag,
                (SELECT COUNT(*) FROM ordemservico os WHERE os.IdTag = tags.IdTag AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')) AS QtdeOS_Subquery,
                QtdeOS AS QtdeOS_Original
            FROM tags
            WHERE IdTag IN (SELECT IdTag FROM ordemservico WHERE IdOrdemServico IN (26, 27, 28, 29, 31))
        `);
        console.log("TAG QUERY:", tags);
        
        const [oses] = await pool.query(`
            SELECT IdOrdemServico, IdTag, D_E_L_E_T_E
            FROM ordemservico
            WHERE IdOrdemServico IN (26, 27, 28, 29, 31)
        `);
        console.log("OS QUERY:", oses);
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
test();
