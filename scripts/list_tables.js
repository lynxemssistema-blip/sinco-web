const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
    user: process.env.DB_USER || 'lynxlocal',
    password: process.env.DB_PASS || 'jHAzhFG848@yN@U',
    database: process.env.DB_NAME || 'lynxlocal',
    port: 3306
};

async function listTables() {
    let connection;
    try {
        console.log('Connecting to DB:', dbConfig.database);
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute('SHOW TABLES');
        console.log('Tables:', rows.map(r => Object.values(r)[0]));

        // Also check columns for 'pessoajuridica' if it exists, or similar
        const tables = rows.map(r => Object.values(r)[0]);
        const likelyTable = tables.find(t => t.toLowerCase().includes('pessoa') || t.toLowerCase().includes('juridica') || t.toLowerCase().includes('empresa'));

        if (likelyTable) {
            console.log(`\n Describing table ${likelyTable}:`);
            const [cols] = await connection.execute(`DESCRIBE ${likelyTable}`);
            console.log(cols.map(c => c.Field).join(', '));
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

listTables();
