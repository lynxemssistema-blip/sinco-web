const mysql = require('mysql2/promise');
require('dotenv').config();

async function check() {
    const conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT
    });

    try {
        console.log('\n--- VIEW viewordemservicoitemcontrole DEFINITION ---');
        const [rows] = await conn.execute("SHOW CREATE VIEW viewordemservicoitemcontrole");
        console.log(rows[0]['Create View']);

    } catch (err) {
        console.error(err);
    } finally {
        await conn.end();
    }
}

check();
