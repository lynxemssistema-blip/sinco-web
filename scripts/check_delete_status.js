const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.CENTRAL_DB_HOST || 'lynxlocal.mysql.uhserver.com',
    user: process.env.CENTRAL_DB_USER || 'lynxlocal_root',
    password: process.env.CENTRAL_DB_PASS || 'lynx@2022',
    database: process.env.CENTRAL_DB_NAME || 'lynxlocal',
    port: 3306
};

async function main() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        console.log('--- Checking D_E_L_E_T_E for Romaneio 15 items ---');
        const [rows] = await connection.execute(
            "SELECT IdRomaneioItem, D_E_L_E_T_E FROM romaneioitem WHERE IdRomaneio = 15"
        );
        console.table(rows);
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
    }
}

main();
