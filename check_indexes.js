const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
    user: process.env.CENTRAL_DB_USER || 'lynxlocal_root',
    password: process.env.CENTRAL_DB_PASS || 'lynx@2022',
    database: process.env.CENTRAL_DB_NAME || 'lynxlocal',
    port: 3306
};

async function checkIndexes() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('--- Database Index Check ---');

        const tables = ['usuario', 'ordemservicoitem', 'ordemservico', 'romaneio', 'romaneioitem', 'conexoes_bancos'];

        for (const table of tables) {
            console.log(`\n[Table: ${table}]`);
            try {
                const [rows] = await connection.execute(`SHOW INDEX FROM ${table}`);
                if (rows.length === 0) {
                    console.log('No indexes found.');
                } else {
                    rows.forEach(row => {
                        console.log(`- ${row.Key_name}: ${row.Column_name} (${row.Non_unique ? 'Non-Unique' : 'Unique'})`);
                    });
                }
            } catch (e) {
                console.warn(`Could not check indexes for ${table}: ${e.message}`);
            }
        }

    } catch (error) {
        console.error('Connection Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkIndexes();
