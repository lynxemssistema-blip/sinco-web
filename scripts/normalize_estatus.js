const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'lynxlocal.mysql.uhserver.com',
        user: process.env.DB_USER || 'lynxlocal',
        password: process.env.DB_PASS || 'jHAzhFG848@yN@U',
        database: process.env.DB_NAME || 'lynxlocal'
    });

    try {
        console.log('--- Database: ' + (process.env.DB_NAME || 'lynxlocal') + ' ---');

        // 1. Normalize 'Finalizado' -> 'F'
        const [resF] = await connection.execute(
            "UPDATE romaneio SET Estatus = 'F' WHERE Estatus = 'Finalizado' OR Estatus = 'F'"
        );
        console.log(`Updated to 'F': ${resF.affectedRows} rows.`);

        // 2. Normalize everything else -> ''
        const [resEmpty] = await connection.execute(
            "UPDATE romaneio SET Estatus = '' WHERE Estatus != 'F' OR Estatus IS NULL"
        );
        console.log(`Updated to '': ${resEmpty.affectedRows} rows.`);

        console.log('Normalization complete.');
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await connection.end();
    }
}

runMigration();
