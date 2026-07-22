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
                p.IdProjeto, p.Projeto,
                COALESCE((SELECT COUNT(*) FROM ordemservico os 
                           WHERE (os.IdProjeto = p.IdProjeto OR (os.Projeto = p.Projeto AND p.Projeto IS NOT NULL))
                             AND (os.D_E_L_E_T_E IS NULL OR os.D_E_L_E_T_E = '' OR os.D_E_L_E_T_E = ' ')), 0) AS QtdeOS
            FROM projetos p
            WHERE p.Projeto = '0001'
        `);
        console.log("Project Result:", rows[0]);
    } catch (e) {
        console.error(e);
    }
    process.exit();
}
test();
