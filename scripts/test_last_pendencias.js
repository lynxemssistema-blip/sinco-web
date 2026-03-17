require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    try {
        const [rows] = await pool.query('SELECT IdOrdemServicoItemPendencia, TipoCadastro, OrigemPendencia, Estatus, DescricaoPendencia FROM ordemservicoitempendencia ORDER BY IdOrdemServicoItemPendencia DESC LIMIT 5');
        console.log(rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

check();
