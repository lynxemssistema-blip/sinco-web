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
        const [rows] = await connection.execute(
            "SELECT * FROM romaneioitem WHERE IdRomaneio = 15"
        );
        const [viewRows] = await connection.execute(
            "SELECT * FROM viewromaneioitem WHERE IdRomaneio = 15"
        );

        const results = {
            tableRows: rows,
            viewRows: viewRows
        };

        console.log(JSON.stringify(results, null, 2));

    } catch (error) {
        console.error(JSON.stringify({ error: error.message }));
    } finally {
        await connection.end();
    }
}

main();
