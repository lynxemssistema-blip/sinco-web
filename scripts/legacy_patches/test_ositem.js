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
        console.log("Checking ordemservicoitem for IdOrdemServicoItem=7:");
        const [rows] = await pool.query("SELECT * FROM ordemservicoitem WHERE IdOrdemServicoItem = 7");
        console.log("ordemservicoitem rows:", rows.length);
        if (rows.length > 0) {
            console.log("First row D_E_L_E_T_E:", rows[0].D_E_L_E_T_E);
            console.log("First row IdMatriz:", rows[0].IdMatriz);
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
run();
