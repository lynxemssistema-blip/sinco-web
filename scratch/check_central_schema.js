require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkSchema() {
    const conn = await mysql.createConnection({
        host: process.env.CENTRAL_DB_HOST,
        user: process.env.CENTRAL_DB_USER,
        password: process.env.CENTRAL_DB_PASS,
        database: process.env.CENTRAL_DB_NAME
    });

    try {
        const [rows] = await conn.execute('DESCRIBE usuarios_central');
        console.log(rows);
    } catch (err) {
        console.error(err);
    } finally {
        await conn.end();
    }
}
checkSchema();
