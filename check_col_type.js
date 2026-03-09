const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkColType() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306
    });

    try {
        const query = "SHOW COLUMNS FROM ordemservicoitem LIKE 'TxtMontagem'";
        const [rows] = await connection.execute(query);
        console.table(rows);

        const query2 = "SHOW COLUMNS FROM ordemservicoitem LIKE 'txtCorte'";
        const [rows2] = await connection.execute(query2);
        console.table(rows2);

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await connection.end();
    }
}

checkColType();
