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
        console.log('--- ALL VIEWS ---');
        const [views] = await conn.execute("SHOW FULL TABLES WHERE TABLE_TYPE = 'VIEW'");
        console.table(views);

        console.log('\n--- ALL TABLES LIKE %controle% ---');
        const [tables] = await conn.execute("SHOW TABLES LIKE '%controle%'");
        console.table(tables);

        console.log('\n--- DETAILS OF ordemservicoitemcontrole ---');
        const [cols] = await conn.execute("DESCRIBE ordemservicoitemcontrole");
        console.table(cols);

    } catch (err) {
        console.error(err);
    } finally {
        await conn.end();
    }
}

check();
