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
        const [tableCols] = await conn.execute('DESCRIBE ordemservicoitemcontrole');
        console.log('--- TABLE ordemservicoitemcontrole ---');
        console.table(tableCols);

        const [viewCols] = await conn.execute("SHOW FULL TABLES WHERE TABLE_TYPE = 'VIEW'");
        console.log('\n--- VIEWS ---');
        console.table(viewCols);

        // Check specifically for viewordemservicoitemcontrole
        const [vCheck] = await conn.execute("SHOW TABLES LIKE 'viewordemservicoitemcontrole'");
        if (vCheck.length > 0) {
            const [vCols] = await conn.execute('DESCRIBE viewordemservicoitemcontrole');
            console.log('\n--- VIEW viewordemservicoitemcontrole ---');
            console.table(vCols);
        } else {
            console.log('\nView viewordemservicoitemcontrole NOT found');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await conn.end();
    }
}

check();
