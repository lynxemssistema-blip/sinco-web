const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSchema() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.DB_USER || 'lynxlocal',
        password: process.env.DB_PASS || 'jHAzhFG848@yN@U',
        database: process.env.DB_NAME || 'lynxlocal',
        port: 3306
    });

    const tables = ['projetos', 'tags', 'ordemservico', 'ordemservicoitem'];
    
    for (const table of tables) {
        console.log(`\n--- Schema for ${table} ---`);
        const [rows] = await connection.execute(`DESCRIBE ${table}`);
        rows.forEach(row => {
            console.log(`${row.Field.padEnd(30)} | ${row.Type}`);
        });
    }

    await connection.end();
}

checkSchema().catch(console.error);
