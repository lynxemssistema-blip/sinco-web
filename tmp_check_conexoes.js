const mysql = require('mysql2/promise');
require('dotenv').config();

async function main() {
    const conn = await mysql.createConnection({
        host: process.env.CENTRAL_DB_HOST,
        user: process.env.CENTRAL_DB_USER,
        password: process.env.CENTRAL_DB_PASS,
        database: process.env.CENTRAL_DB_NAME
    });

    try {
        const [rows] = await conn.query('SHOW COLUMNS FROM conexoes_bancos');
        console.log("Columns in conexoes_bancos:", rows);

        const [data] = await conn.query('SELECT * FROM conexoes_bancos');
        console.log("Current connections:", data);
    } catch (e) {
        console.error(e);
    } finally {
        await conn.end();
    }
}
main();
