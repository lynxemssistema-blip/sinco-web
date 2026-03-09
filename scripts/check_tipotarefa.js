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
        const [rows] = await pool.execute("DESCRIBE tipotarefa");
        console.log(rows);
        await pool.end();
    } catch (e) {
        console.error(e);
    }
}
checkTable();
