const mysql = require('mysql2/promise');
require('dotenv').config({ path: 'c:/SincoWeb/SINCO-WEB/SINCO-WEB/.env' });

async function checkTable() {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });
        console.log('--- ordemservicoitempendencia ---');
        const [rows] = await pool.execute("DESCRIBE ordemservicoitempendencia");
        rows.forEach(r => {
            if (r.Field.includes('Data')) console.log(r);
        });

        console.log('\n--- tipotarefa ---');
        const [rows2] = await pool.execute("DESCRIBE tipotarefa");
        console.log(rows2);

        await pool.end();
    } catch (e) {
        console.error(e);
    }
}
checkTable();
