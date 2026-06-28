const mysql = require('mysql2/promise');
require('dotenv').config();

async function showColumns() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        const [rows] = await connection.execute("SHOW COLUMNS FROM ordemservicoitem WHERE Field LIKE 'txt%' OR Field LIKE 'Txt%'");
        console.table(rows);
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await connection.end();
    }
}

showColumns();
