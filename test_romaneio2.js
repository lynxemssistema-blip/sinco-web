const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log("Checking all romaneioitem for IdRomaneio=3:");
        const [rows] = await pool.query(`
            SELECT ri.IdRomaneioItem, ri.IDOrdemServicoITEM, ri.D_E_L_E_T_E as ri_del, osi.D_E_L_E_T_E as osi_del
            FROM romaneioitem ri
            LEFT JOIN ordemservicoitem osi ON osi.IdOrdemServicoItem = ri.IDOrdemServicoITEM
            WHERE ri.IdRomaneio = 3
        `);
        console.log(rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
